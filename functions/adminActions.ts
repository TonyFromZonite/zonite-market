import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

      // ─── COMPTE VENDEUR ──────────────────────────────────────────────────────
      case 'updateCompteVendeur': {
        const result = await db.CompteVendeur.update(payload.compteId, payload.data);
        return Response.json({ success: true, result });
      }

      // ─── VENDEUR ─────────────────────────────────────────────────────────────
      case 'listVendeurs': {
        const result = await db.Vendeur.list('-created_date');
        return Response.json({ success: true, result });
      }
      case 'updateVendeur': {
        const result = await db.Vendeur.update(payload.vendeurId, payload.data);
        return Response.json({ success: true, result });
      }
      case 'createVendeurInitial': {
        const createResult = await base44.functions.invoke('createValidatedSeller', payload);
        return Response.json(createResult.data);
      }
      case 'validateKycAndActivate': {
        const validateResult = await base44.functions.invoke('validateKycAndActivateSeller', payload);
        return Response.json(validateResult.data);
      }
      case 'deleteVendeur': {
        try {
          await db.Vendeur.delete(payload.vendeurId);
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