import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fonction de synchronisation des vendeurs avec base44.users
 * - Crée les utilisateurs Base44 manquants pour les sellers existants
 * - Maintient la synchronisation entre Seller et User entities
 * - Loggue les erreurs pour suivi
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    const { action = 'sync' } = await req.json();

    if (action === 'verify') {
      // ─── VÉRIFICATION SANS MODIFICATION ───
      const allSellers = await db.Seller.list();
      const report = {
        timestamp: new Date().toISOString(),
        total_sellers: allSellers.length,
        synced: 0,
        orphans: [],
        errors: []
      };

      for (const seller of allSellers) {
        try {
          const users = await db.User.filter({ email: seller.email });
          
          if (users.length === 0) {
            report.orphans.push({
              seller_id: seller.id,
              email: seller.email,
              nom_complet: seller.nom_complet,
              created_date: seller.created_date,
              statut_kyc: seller.statut_kyc
            });
          } else {
            report.synced++;
          }
        } catch (error) {
          report.errors.push({
            seller_email: seller.email,
            error: error.message
          });
        }
      }

      // Log dans JournalAudit
      try {
        await db.JournalAudit.create({
          action: 'Vérification sync sellers-users',
          module: 'systeme',
          details: `Vérification: ${report.synced}/${report.total_sellers} sellers synchronisés, ${report.orphans.length} orphelins détectés`,
          utilisateur: user.email,
          donnees_apres: JSON.stringify(report)
        });
      } catch (auditError) {
        console.error('Erreur création audit:', auditError.message);
      }

      return Response.json({ success: true, report });

    } else if (action === 'sync') {
      // ─── SYNCHRONISATION AUTOMATIQUE ───
      const allSellers = await db.Seller.list();
      const syncLog = {
        timestamp: new Date().toISOString(),
        total_sellers: allSellers.length,
        created: 0,
        updated: 0,
        errors: []
      };

      for (const seller of allSellers) {
        try {
          const users = await db.User.filter({ email: seller.email });
          
          if (users.length === 0) {
            // Créer l'utilisateur manquant
            const newUser = await db.User.create({
              email: seller.email,
              full_name: seller.nom_complet,
              role: 'user'
            });

            // Mettre à jour le seller avec l'ID Base44
            try {
              await db.Seller.update(seller.id, {
                user_id_base44: newUser.id
              });
            } catch (updateError) {
              console.warn(`Seller créé dans Base44 mais update echoué: ${updateError.message}`);
            }

            syncLog.created++;
            console.log(`✅ Créé User Base44: ${seller.email} (ID: ${newUser.id})`);
            
            // Envoyer notification au seller
            try {
              await db.NotificationVendeur.create({
                vendeur_email: seller.email,
                titre: '✅ Compte synchronisé',
                message: 'Votre compte a été synchronisé avec les systèmes Base44. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
                type: 'info'
              });
            } catch (notifError) {
              console.warn(`Notification non envoyée pour ${seller.email}: ${notifError.message}`);
            }

          } else {
            // L'utilisateur existe, vérifier la liaison
            if (!seller.user_id_base44 || seller.user_id_base44 !== users[0].id) {
              await db.Seller.update(seller.id, {
                user_id_base44: users[0].id
              });
              syncLog.updated++;
              console.log(`🔄 Lié seller à User Base44 existant: ${seller.email}`);
            }
          }
        } catch (error) {
          syncLog.errors.push({
            seller_id: seller.id,
            seller_email: seller.email,
            error: error.message
          });
          console.error(`❌ Erreur sync ${seller.email}:`, error.message);
        }
      }

      // Log dans JournalAudit
      try {
        await db.JournalAudit.create({
          action: 'Synchronisation sellers-users exécutée',
          module: 'systeme',
          details: `Sync terminée: ${syncLog.created} users créés, ${syncLog.updated} sellers mis à jour`,
          utilisateur: user.email,
          donnees_apres: JSON.stringify(syncLog)
        });
      } catch (auditError) {
        console.error('Erreur création audit:', auditError.message);
      }

      return Response.json({ success: true, sync_log: syncLog });

    } else {
      return Response.json({ error: 'Action non reconnue (sync ou verify)' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur critiques:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});