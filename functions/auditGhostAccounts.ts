import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { autoFix = true } = await req.json();
    
    const report = {
      timestamp: new Date().toISOString(),
      auditedBy: user.email,
      ghostAccounts: [],
      orphanAccounts: [],
      missingKYC: [],
      corrections: [],
      summary: {
        totalUsers: 0,
        totalSellers: 0,
        ghostAccountsFound: 0,
        orphanAccountsFound: 0,
        missingKYCFound: 0,
        accountsFixed: 0
      }
    };

    // ===================================
    // 1. RÉCUPÉRER TOUS LES COMPTES BASE44
    // ===================================
    
    // Récupérer tous les utilisateurs Base44
    const base44Users = await base44.asServiceRole.entities.User.list();
    report.summary.totalUsers = base44Users.length;
    
    // Récupérer tous les sellers de la base de données app
    const appSellers = await base44.asServiceRole.entities.Seller.list();
    report.summary.totalSellers = appSellers.length;

    console.log(`Audit: ${base44Users.length} users Base44, ${appSellers.length} sellers app`);

    // ===================================
    // 2. DÉTECTER LES COMPTES FANTÔMES
    // ===================================
    
    // Comptes fantômes = Users Base44 avec role "vendeur" mais pas de Seller correspondant dans l'app
    for (const b44User of base44Users) {
      if (b44User.role === 'vendeur') {
        // Chercher le seller correspondant dans l'app
        const correspondingSeller = appSellers.find(s => s.email === b44User.email);
        
        if (!correspondingSeller) {
          // COMPTE FANTÔME DÉTECTÉ
          report.ghostAccounts.push({
            email: b44User.email,
            full_name: b44User.full_name,
            created_date: b44User.created_date,
            issue: 'User Base44 existe mais pas de Seller dans app'
          });
          
          report.summary.ghostAccountsFound++;
          
          if (autoFix) {
            // Option 1: Créer le compte Seller manquant
            // Option 2: Supprimer le User Base44 fantôme (recommandé si compte incomplet)
            
            try {
              // Vérifier si le user Base44 a des données complètes
              const hasCompleteData = b44User.full_name && b44User.full_name.trim().length > 0;
              
              if (hasCompleteData) {
                // Créer le Seller manquant
                const newSeller = await base44.asServiceRole.entities.Seller.create({
                  email: b44User.email,
                  nom_complet: b44User.full_name || b44User.email,
                  telephone: '',
                  mot_de_passe_hash: '', // Mot de passe déjà géré par Base44 User
                  statut_kyc: 'en_attente',
                  statut: 'en_attente_kyc',
                  video_vue: false,
                  conditions_acceptees: false,
                  catalogue_debloque: false,
                  taux_commission: 0,
                  solde_commission: 0,
                  total_commissions_gagnees: 0,
                  total_commissions_payees: 0,
                  nombre_ventes: 0,
                  chiffre_affaires_genere: 0,
                  ventes_reussies: 0,
                  ventes_echouees: 0
                });
                
                // Créer notification KYC en attente
                await base44.asServiceRole.entities.Notification.create({
                  destinataire_email: b44User.email,
                  destinataire_role: 'vendeur',
                  type: 'kyc_soumis',
                  titre: '📋 Complétez votre KYC',
                  message: 'Veuillez soumettre vos documents KYC pour activer votre compte vendeur.',
                  lien: '/InscriptionVendeur',
                  priorite: 'importante'
                });
                
                report.corrections.push(`✅ Seller créé pour ${b44User.email} (ID: ${newSeller.id})`);
                report.summary.accountsFixed++;
                
              } else {
                // Supprimer le User Base44 incomplet/fantôme
                await base44.asServiceRole.entities.User.delete(b44User.id);
                report.corrections.push(`🗑️ User Base44 fantôme supprimé: ${b44User.email} (données incomplètes)`);
                report.summary.accountsFixed++;
              }
              
            } catch (error) {
              console.error(`Erreur traitement ghost account ${b44User.email}:`, error);
              report.corrections.push(`❌ ERREUR: ${b44User.email}: ${error.message}`);
            }
          }
        }
      }
    }

    // ===================================
    // 3. DÉTECTER LES COMPTES ORPHELINS
    // ===================================
    
    // Comptes orphelins = Sellers dans l'app mais pas de User Base44 correspondant
    for (const seller of appSellers) {
      const correspondingUser = base44Users.find(u => u.email === seller.email);
      
      if (!correspondingUser) {
        // COMPTE ORPHELIN DÉTECTÉ
        report.orphanAccounts.push({
          id: seller.id,
          email: seller.email,
          nom_complet: seller.nom_complet,
          statut_kyc: seller.statut_kyc,
          created_date: seller.created_date,
          issue: 'Seller existe dans app mais pas de User Base44'
        });
        
        report.summary.orphanAccountsFound++;
        
        if (autoFix) {
          // Pour les comptes orphelins: supprimer le Seller de l'app car pas de User Base44 = pas d'authentification possible
          try {
            await base44.asServiceRole.entities.Seller.delete(seller.id);
            report.corrections.push(`🗑️ Seller orphelin supprimé: ${seller.email} (pas de User Base44)`);
            report.summary.accountsFixed++;
          } catch (error) {
            console.error(`Erreur suppression seller orphelin ${seller.email}:`, error);
            report.corrections.push(`❌ ERREUR: Impossible de supprimer ${seller.email}: ${error.message}`);
          }
        }
      }
    }

    // ===================================
    // 4. VÉRIFIER COHÉRENCE KYC
    // ===================================
    
    // Tous les sellers doivent avoir un statut_kyc
    for (const seller of appSellers) {
      if (!seller.statut_kyc) {
        report.missingKYC.push({
          id: seller.id,
          email: seller.email,
          nom_complet: seller.nom_complet,
          issue: 'Statut KYC manquant'
        });
        
        report.summary.missingKYCFound++;
        
        if (autoFix) {
          await base44.asServiceRole.entities.Seller.update(seller.id, {
            statut_kyc: 'en_attente'
          });
          
          report.corrections.push(`Statut KYC fixé à "en_attente" pour ${seller.email}`);
          report.summary.accountsFixed++;
        }
      }
      
      // Vérifier cohérence statut_kyc ↔ statut
      if (seller.statut_kyc === 'valide' && seller.statut !== 'actif') {
        report.missingKYC.push({
          id: seller.id,
          email: seller.email,
          nom_complet: seller.nom_complet,
          issue: 'KYC validé mais compte non actif'
        });
        
        if (autoFix) {
          await base44.asServiceRole.entities.Seller.update(seller.id, {
            statut: 'actif'
          });
          
          report.corrections.push(`Statut activé pour ${seller.email} (KYC déjà validé)`);
          report.summary.accountsFixed++;
        }
      }
    }

    // ===================================
    // 5. VÉRIFIER WORKFLOW CRÉATION
    // ===================================
    
    const workflowIssues = [];
    
    // Vérifier que registerVendor et createSellerManually créent bien les 2 entités
    const recentUsers = base44Users.filter(u => {
      const age = Date.now() - new Date(u.created_date).getTime();
      return age < 24 * 60 * 60 * 1000; // Dernières 24h
    });
    
    for (const recentUser of recentUsers) {
      if (recentUser.role === 'vendeur') {
        const seller = appSellers.find(s => s.email === recentUser.email);
        if (!seller) {
          workflowIssues.push({
            email: recentUser.email,
            created: recentUser.created_date,
            issue: 'User créé récemment (<24h) sans Seller correspondant - workflow défaillant'
          });
        }
      }
    }

    // ===================================
    // 6. CRÉER AUDIT LOG
    // ===================================
    
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Audit comptes fantômes',
      module: 'systeme',
      details: `Ghost: ${report.summary.ghostAccountsFound}, Orphelins: ${report.summary.orphanAccountsFound}, KYC manquants: ${report.summary.missingKYCFound}, Corrigés: ${report.summary.accountsFixed}`,
      utilisateur: user.email,
      donnees_apres: JSON.stringify(report.summary)
    });

    // ===================================
    // RÉSUMÉ & STATUT
    // ===================================
    
    const totalIssues = report.summary.ghostAccountsFound + 
                        report.summary.orphanAccountsFound + 
                        report.summary.missingKYCFound;
    
    report.status = totalIssues === 0 ? 'perfect' : 
                    report.summary.accountsFixed === totalIssues ? 'corrected' : 
                    'needs_attention';
    
    report.workflowIssues = workflowIssues;

    return Response.json({ 
      success: true, 
      report,
      synchronized: report.status === 'perfect' || report.status === 'corrected'
    });

  } catch (error) {
    console.error('Erreur audit comptes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});