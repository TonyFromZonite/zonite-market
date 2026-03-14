import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Audit & Auto-correction: Détecte et répare les vendeurs incomplets
 * - Vendeurs sans user Base44
 * - Vendeurs sans notifications
 * - Incohérences KYC/statut
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { autoFix = true } = body;

    const db = base44.asServiceRole.entities;
    const report = {
      timestamp: new Date().toISOString(),
      checked: 0,
      issues: [],
      fixed: 0,
      skipped: 0
    };

    // Récupérer tous les vendeurs
    const sellers = await db.Seller.list('-created_date');
    const base44Users = await base44.asServiceRole.entities.User.list();
    const notifications = await db.Notification.list();

    report.checked = sellers.length;

    for (const seller of sellers) {
      const issues = [];

      // ───────────────────────────────────────────────────────────────────────
      // VÉRIFICATION 1: User Base44 manquant
      // ───────────────────────────────────────────────────────────────────────
      
      const hasBase44User = base44Users.some(u => u.email === seller.email);
      if (!hasBase44User) {
        issues.push({
          type: 'missing_base44_user',
          severity: 'high',
          message: `User Base44 manquant pour ${seller.email}`
        });

        // NOTE: On ne peut pas créer automatiquement un User Base44
        // car c'est géré par le système d'authentification Base44
        // Admin doit inviter l'utilisateur manuellement
      }

      // ───────────────────────────────────────────────────────────────────────
      // VÉRIFICATION 2: Incohérence KYC/Statut
      // ───────────────────────────────────────────────────────────────────────
      
      if (seller.statut_kyc === 'valide' && seller.statut !== 'actif') {
        issues.push({
          type: 'kyc_status_mismatch',
          severity: 'high',
          message: `KYC validé mais statut = ${seller.statut} (devrait être 'actif')`
        });

        if (autoFix) {
          await db.Seller.update(seller.id, { statut: 'actif' });
          report.fixed++;
          issues.push({ type: 'kyc_status_mismatch', fixed: true });
        } else {
          report.skipped++;
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // VÉRIFICATION 3: Notification KYC manquante
      // ───────────────────────────────────────────────────────────────────────
      
      const hasKYCNotif = notifications.some(n => 
        n.destinataire_email === seller.email && 
        n.type === 'kyc_soumis'
      );

      if (seller.statut_kyc === 'en_attente' && !hasKYCNotif) {
        issues.push({
          type: 'missing_kyc_notification',
          severity: 'medium',
          message: `Notification KYC manquante pour ${seller.email}`
        });

        if (autoFix) {
          try {
            await db.Notification.create({
              destinataire_email: seller.email,
              destinataire_role: 'vendeur',
              type: 'kyc_soumis',
              titre: '📋 Dossier KYC en attente',
              message: 'Votre compte vendeur attend la validation de votre dossier KYC.',
              priorite: 'importante',
              lien: '/InscriptionVendeur'
            });
            report.fixed++;
            issues.push({ type: 'missing_kyc_notification', fixed: true });
          } catch (e) {
            console.warn('Notification creation failed:', e.message);
            report.skipped++;
          }
        } else {
          report.skipped++;
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // VÉRIFICATION 4: Données de base manquantes
      // ───────────────────────────────────────────────────────────────────────
      
      if (!seller.statut_kyc || seller.statut_kyc === '') {
        issues.push({
          type: 'missing_kyc_status',
          severity: 'high',
          message: `Statut KYC manquant pour ${seller.email}`
        });

        if (autoFix) {
          await db.Seller.update(seller.id, { statut_kyc: 'en_attente' });
          report.fixed++;
          issues.push({ type: 'missing_kyc_status', fixed: true });
        } else {
          report.skipped++;
        }
      }

      if (!seller.taux_commission || seller.taux_commission === 0) {
        issues.push({
          type: 'missing_commission_rate',
          severity: 'low',
          message: `Taux commission à 0 pour ${seller.email}`
        });

        if (autoFix) {
          await db.Seller.update(seller.id, { taux_commission: 10 });
          report.fixed++;
          issues.push({ type: 'missing_commission_rate', fixed: true });
        } else {
          report.skipped++;
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // Ajouter les problèmes trouvés au rapport
      // ───────────────────────────────────────────────────────────────────────
      
      if (issues.length > 0) {
        report.issues.push({
          seller_id: seller.id,
          email: seller.email,
          nom_complet: seller.nom_complet,
          issues: issues.filter(i => !i.fixed)
        });
      }
    }

    // Créer journal d'audit
    try {
      await db.JournalAudit.create({
        action: 'Validation intégrité vendeurs',
        module: 'vendeur',
        details: `Vérification: ${report.checked} vendeurs, ${report.issues.length} problèmes, ${report.fixed} corrigés, ${report.skipped} en attente`,
        utilisateur: user.email,
        donnees_apres: JSON.stringify(report)
      });
    } catch (e) {
      console.warn('Audit log failed:', e.message);
    }

    return Response.json({
      success: true,
      report,
      action_required: report.skipped > 0,
      summary: {
        checked: report.checked,
        issues_found: report.issues.length,
        auto_fixed: report.fixed,
        requires_manual_action: report.skipped
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});