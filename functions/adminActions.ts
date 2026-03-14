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
             mot_de_passe_hash: hashedPassword, statut_kyc: 'en_attente', statut: 'en_attente_kyc',
             video_vue: false, conditions_acceptees: false, catalogue_debloque: false,
             taux_commission: 10, solde_commission: 0, total_commissions_gagnees: 0, total_commissions_payees: 0,
             nombre_ventes: 0, chiffre_affaires_genere: 0, ventes_reussies: 0, ventes_echouees: 0,
             date_embauche: new Date().toISOString().split('T')[0]
           });
           await db.JournalAudit.create({ action: 'Vendeur créé par admin', module: 'vendeur', details: `Vendeur ${nom_complet} (${email}) créé`, utilisateur: user.email, entite_id: seller.id });
           return Response.json({ success: true, seller_id: seller.id, email, status: 'en_attente_kyc' });
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

      default:
        return Response.json({ error: `Action inconnue: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});