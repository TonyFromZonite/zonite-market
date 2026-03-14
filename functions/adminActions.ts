import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

/**
 * Fonction centrale pour toutes les opérations admin nécessitant le service role.
 * action: nom de l'opération
 * payload: données de l'opération
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, payload, _session: rootSession } = body;

    if (!action) {
      return Response.json({ error: 'action requise' }, { status: 400 });
    }

    // Vérification du rôle admin ou sous_admin (session Base44 ou session custom)
    let authorized = false;
    try {
      const user = await base44.auth.me();
      if (user && ['admin', 'sous_admin'].includes(user.role)) authorized = true;
    } catch (_) {}

    // Fallback: vérifier via la session custom passée dans le body (racine ou payload)
    if (!authorized) {
      const session = rootSession || payload?._session;
      if (session && ['admin', 'sous_admin'].includes(session.role)) {
        if (session.role === 'admin') {
          authorized = true;
        } else if (session.role === 'sous_admin' && session.id) {
          const sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ id: session.id, statut: 'actif' });
          if (sousAdmins.length > 0) authorized = true;
        }
      }
    }

    if (!authorized) {
      return Response.json({ error: 'Accès refusé: droits insuffisants' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;

    switch (action) {

      // ─── PRODUIT ────────────────────────────────────────────────────────────
      case 'updateProduit': {
        const result = await db.Produit.update(payload.produitId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── COMMANDE VENDEUR ────────────────────────────────────────────────────
      case 'updateCommandeVendeur': {
        const result = await db.CommandeVendeur.update(payload.commandeId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── COMPTE VENDEUR (migré vers Seller) ─────────────────────────────────
      case 'updateCompteVendeur': {
        const result = await db.Seller.update(payload.compteId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── VENDEUR (SELLER) ────────────────────────────────────────────────────
      case 'listVendeurs': {
        const result = await db.Seller.list('-created_date');
        return Response.json({ success: true, result });
      }
      case 'updateVendeur': {
        const result = await db.Seller.update(payload.vendeurId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'createVendeurInitial': {
         const { nom_complet, email, telephone, ville, quartier, mot_de_passe, numero_mobile_money, operateur_mobile_money = 'orange_money' } = payload.data || payload;
         if (!nom_complet || !email || !mot_de_passe) {
           return Response.json({ error: 'Données manquantes: nom_complet, email, mot_de_passe requis' }, { status: 400 });
         }
         try {
           const existingSellers = await db.Seller.filter({ email });
           if (existingSellers.length > 0) {
             return Response.json({ error: `Un vendeur existe déjà avec l'email ${email}` }, { status: 409 });
           }
           const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
           const seller = await db.Seller.create({
             email, nom_complet, telephone: telephone || '', ville: ville || '', quartier: quartier || '',
             numero_mobile_money: numero_mobile_money || '', operateur_mobile_money,
             mot_de_passe_hash: hashedPassword, 
             statut_kyc: 'valide',  // NOUVEAU : Admin-created sellers are immediately valid
             statut: 'actif',       // NOUVEAU : Statut actif immédiatement
             video_vue: false, conditions_acceptees: true, catalogue_debloque: false,  // NOUVEAU : conditions_acceptees = true
             taux_commission: 10, solde_commission: 0, total_commissions_gagnees: 0, total_commissions_payees: 0,
             nombre_ventes: 0, chiffre_affaires_genere: 0, ventes_reussies: 0, ventes_echouees: 0,
             date_embauche: new Date().toISOString().split('T')[0]
           });

           // NOUVEAU : Créer immédiatement l'utilisateur Base44 avec rôle vendeur
           const adminUser = await base44.auth.me().catch(() => null);
           let userCreatedInBase44 = false;
           let base44UserId = null;

           try {
             // Vérifier si l'utilisateur existe déjà dans base44.users
             const existingUsers = await db.User.filter({ email });

             if (existingUsers.length === 0) {
               // Créer l'utilisateur dans base44.users avec rôle 'user'
               const newUser = await db.User.create({
                 email,
                 full_name: nom_complet,
                 role: 'user'
               });
               base44UserId = newUser.id;
               userCreatedInBase44 = true;
               console.log(`✅ Utilisateur Base44 créé: ${email} (ID: ${base44UserId})`);
             } else {
               base44UserId = existingUsers[0].id;
               console.log(`ℹ️ Utilisateur Base44 existant: ${email} (ID: ${base44UserId})`);
             }
           } catch (userError) {
             console.error(`⚠️ Erreur création/recherche utilisateur Base44 pour ${email}:`, userError.message);
           }

           // Ajouter l'ID Base44 au seller pour synchronisation
           try {
             if (base44UserId) {
               await db.Seller.update(seller.id, {
                 user_id_base44: base44UserId
               });
             }
           } catch (syncError) {
             console.error(`⚠️ Erreur mise à jour seller avec user_id_base44:`, syncError.message);
           }

           // Créer l'audit avec plus de détails
           await db.JournalAudit.create({ 
             action: 'Vendeur créé par admin (immédiatement actif)', 
             module: 'vendeur', 
             details: `Vendeur ${nom_complet} (${email}) créé par ${adminUser?.email || 'admin'} - Statut: ACTIF - Utilisateur Base44: ${userCreatedInBase44 ? 'CRÉÉ' : 'EXISTANT'} (ID: ${base44UserId})`, 
             utilisateur: adminUser?.email || 'system', 
             entite_id: seller.id 
           });

           // NOUVEAU : Envoyer email avec identifiants immédiatement
           try {
             await base44.integrations.Core.SendEmail({
               to: email,
               subject: '🎉 Votre compte ZONITE a été créé - Identifiants de connexion',
               body: `Bonjour ${nom_complet},\n\n🎉 Bienvenue chez ZONITE !\n\nVotre compte vendeur a été créé par notre équipe et est immédiatement actif.\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ Pour votre sécurité, changez ce mot de passe dès votre première connexion.\n\n📹 Prochaine étape : Regardez la vidéo de formation pour accéder à votre catalogue de produits.\n\nBon courage et bonne vente !\n\nL'équipe ZONITE`
             });
           } catch (e) {
             console.error('Email send failed:', e.message);
           }

           return Response.json({ success: true, seller_id: seller.id, email, status: 'actif' });
         } catch (error) {
           console.error('Erreur création vendeur:', error);
           return Response.json({ error: error.message }, { status: 500 });
         }
       }
      case 'validateKycAndActivate': {
        const validateResult = await base44.functions.invoke('validateKycAndActivateSeller', payload);
        return Response.json(validateResult.data);
      }
      case 'deleteVendeur': {
        try {
          await db.Seller.delete(payload.vendeurId);
          return Response.json({ success: true });
        } catch (error) {
          if (error.message.includes('not found')) {
            return Response.json({ success: true, message: 'Vendeur déjà supprimé' });
          }
          throw error;
        }
      }

      // ─── CANDIDATURE ─────────────────────────────────────────────────────────
      case 'updateCandidature': {
        const result = await db.CandidatureVendeur.update(payload.candidatureId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── VENTE (commande admin) ───────────────────────────────────────────────
      case 'updateVente': {
        const result = await db.Vente.update(payload.venteId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── SOUS-ADMIN ──────────────────────────────────────────────────────────
      case 'updateSousAdmin': {
        const result = await db.SousAdmin.update(payload.sousAdminId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'createSousAdmin': {
        const result = await db.SousAdmin.create(payload.data);

        // Envoyer email avec identifiants de connexion
        const { email, nom_complet, mot_de_passe } = payload.data;
        if (email && nom_complet && mot_de_passe) {
          try {
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: '🔐 Accès ZONITE Administrateur - Vos identifiants de connexion',
              body: `Bonjour ${nom_complet},\n\n🔐 Vous avez été nommé sous-administrateur de ZONITE.\n\nVoici vos identifiants de connexion :\n\n📧 Email : ${email}\n🔑 Mot de passe : ${mot_de_passe}\n\n⚠️ Pour votre sécurité, changez ce mot de passe dès votre première connexion.\n\n🔗 Lien de connexion : ${Deno.env.get('APP_URL') || 'https://zonite.app'}\n\nBienvenue dans l'équipe !\n\nL'équipe ZONITE`
            });
          } catch (e) {
            console.error('Email send failed:', e.message);
          }
        }

        return Response.json({ success: true, result });
      }
      case 'deleteSousAdmin': {
        await db.SousAdmin.delete(payload.sousAdminId);
        return Response.json({ success: true });
      }

      // ─── ADMIN PERMISSIONS ───────────────────────────────────────────────────
      case 'updateAdminPermissions': {
        const result = await db.AdminPermissions.update(payload.permId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'createAdminPermissions': {
        const result = await db.AdminPermissions.create(payload.data);
        return Response.json({ success: true, result });
      }
      case 'deleteAdminPermissions': {
        await db.AdminPermissions.delete(payload.permId);
        return Response.json({ success: true });
      }
      case 'listAdminPermissions': {
        const result = await db.AdminPermissions.list();
        return Response.json({ success: true, result });
      }

      // ─── TICKET SUPPORT ──────────────────────────────────────────────────────
      case 'updateTicketSupport': {
        const result = await db.TicketSupport.update(payload.ticketId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── FAQ ─────────────────────────────────────────────────────────────────
      case 'updateFaqItem': {
        const result = await db.FaqItem.update(payload.faqId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'createFaqItem': {
        const result = await db.FaqItem.create(payload.data);
        return Response.json({ success: true, result });
      }
      case 'deleteFaqItem': {
        await db.FaqItem.delete(payload.faqId);
        return Response.json({ success: true });
      }

      // ─── NOTIFICATION VENDEUR ────────────────────────────────────────────────
      case 'updateNotificationVendeur': {
        const result = await db.NotificationVendeur.update(payload.notifId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── PAIEMENT DEMANDE ────────────────────────────────────────────────────
      case 'updateDemandePaiement': {
        const result = await db.DemandePaiementVendeur.update(payload.demandeId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── RETOUR PRODUIT ──────────────────────────────────────────────────────
      case 'updateRetourProduit': {
        const result = await db.RetourProduit.update(payload.retourId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'createRetourProduit': {
        const result = await db.RetourProduit.create(payload.data);
        return Response.json({ success: true, result });
      }

      // ─── PAIEMENT COMMISSION ────────────────────────────────────────────────
      case 'createPaiementCommission': {
        const result = await db.PaiementCommission.create(payload.data);
        return Response.json({ success: true, result });
      }

      // ─── MOUVEMENT STOCK ─────────────────────────────────────────────────────
      case 'createMouvementStock': {
        const result = await db.MouvementStock.create(payload.data);
        return Response.json({ success: true, result });
      }

      // ─── NOTIFICATION VENDEUR (create) ───────────────────────────────────────
      case 'createNotificationVendeur': {
        const result = await db.NotificationVendeur.create(payload.data);
        return Response.json({ success: true, result });
      }

      // ─── JOURNAL AUDIT ───────────────────────────────────────────────────────
      case 'createJournalAudit': {
        const result = await db.JournalAudit.create(payload.data);
        return Response.json({ success: true, result });
      }

      // ─── CONFIG APP ──────────────────────────────────────────────────────────
      case 'updateConfigApp': {
        const result = await db.ConfigApp.update(payload.configId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'createConfigApp': {
        const result = await db.ConfigApp.create(payload.data);
        return Response.json({ success: true, result });
      }

      // ─── PRODUIT (create) ─────────────────────────────────────────────────────
      case 'createProduit': {
        const result = await db.Produit.create(payload.data);
        return Response.json({ success: true, result });
      }

      // ─── PRODUIT (delete) ─────────────────────────────────────────────────────
      case 'deleteProduit': {
        await db.Produit.delete(payload.produitId);
        return Response.json({ success: true });
      }

      // ─── CATEGORIE ────────────────────────────────────────────────────────────
      case 'createCategorie': {
        const result = await db.Categorie.create(payload.data);
        return Response.json({ success: true, result });
      }
      case 'updateCategorie': {
        const result = await db.Categorie.update(payload.categorieId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'deleteCategorie': {
        await db.Categorie.delete(payload.categorieId);
        return Response.json({ success: true });
      }

      // ─── LIVRAISON ────────────────────────────────────────────────────────────
      case 'createLivraison': {
        const result = await db.Livraison.create(payload.data);
        return Response.json({ success: true, result });
      }
      case 'updateLivraison': {
        const result = await db.Livraison.update(payload.livraisonId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'deleteLivraison': {
        await db.Livraison.delete(payload.livraisonId);
        return Response.json({ success: true });
      }

      // ─── SYNC & VERIFICATION ─────────────────────────────────────────────────
      case 'syncSellerBase44Users': {
        // Action de synchronisation: vérifie tous les sellers et crée les users manquants
        try {
          const allSellers = await db.Seller.list();
          const results = { total: 0, synced: 0, errors: [] };

          for (const seller of allSellers) {
            results.total++;
            try {
              // Vérifier si l'utilisateur Base44 existe
              const users = await db.User.filter({ email: seller.email });

              if (users.length === 0) {
                // Créer l'utilisateur manquant
                const newUser = await db.User.create({
                  email: seller.email,
                  full_name: seller.nom_complet,
                  role: 'user'
                });

                // Mettre à jour le seller avec l'ID Base44
                await db.Seller.update(seller.id, {
                  user_id_base44: newUser.id
                });

                results.synced++;
                console.log(`✅ Synced: ${seller.email} -> User ID: ${newUser.id}`);
              } else {
                // L'utilisateur existe, mettre à jour le seller
                await db.Seller.update(seller.id, {
                  user_id_base44: users[0].id
                });
                results.synced++;
              }
            } catch (itemError) {
              results.errors.push({ email: seller.email, error: itemError.message });
              console.error(`❌ Erreur sync ${seller.email}:`, itemError.message);
            }
          }

          return Response.json({ success: true, sync_results: results });
        } catch (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      case 'verifySellersSync': {
        // Action de vérification: liste les sellers orphelins (sans user Base44)
        try {
          const allSellers = await db.Seller.list();
          const orphans = [];
          const synced = [];

          for (const seller of allSellers) {
            const users = await db.User.filter({ email: seller.email });
            if (users.length === 0) {
              orphans.push({ seller_id: seller.id, email: seller.email, nom: seller.nom_complet });
            } else {
              synced.push({ seller_id: seller.id, email: seller.email, user_id: users[0].id });
            }
          }

          return Response.json({ 
            success: true, 
            total_sellers: allSellers.length, 
            synced_count: synced.length, 
            orphans_count: orphans.length,
            orphan_sellers: orphans,
            synced_sellers: synced 
          });
        } catch (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      default:
        return Response.json({ error: `Action inconnue: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});