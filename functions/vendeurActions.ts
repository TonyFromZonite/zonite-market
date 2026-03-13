import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fonction centrale pour toutes les opérations vendeur nécessitant le service role.
 * Authentification via session custom (CompteVendeur) — pas via base44.auth.me().
 * 
 * Chaque appel doit inclure { action, vendeur_email, payload }
 * Le vendeur_email est vérifié en DB pour s'assurer que le compte est actif.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, vendeur_email, payload } = body;

    if (!action) {
      return Response.json({ error: 'action requise' }, { status: 400 });
    }

    // ✅ Authentification via session custom : vérifier que le vendeur existe et est actif
    if (!vendeur_email) {
      return Response.json({ error: 'vendeur_email requis' }, { status: 401 });
    }

    const db = base44.asServiceRole.entities;

    const sellers = await db.Seller.filter({ email: vendeur_email });
    if (!sellers.length) {
      return Response.json({ error: 'Session invalide: compte introuvable' }, { status: 401 });
    }
    const compteAuth = sellers[0];
    if (compteAuth.statut === 'suspendu') {
      return Response.json({ error: 'Compte suspendu' }, { status: 403 });
    }

    switch (action) {

      // ─── DEMANDE PAIEMENT ────────────────────────────────────────────────────
      case 'createDemandePaiement': {
        const { data } = payload;
        // ✅ Forcer l'email depuis la session, pas depuis le payload
        data.vendeur_email = vendeur_email;
        // Vérifier que le compte_id appartient bien à ce vendeur
        if (data.vendeur_id && compteAuth.id !== data.vendeur_id) {
          return Response.json({ error: 'Accès refusé: compte non autorisé' }, { status: 403 });
        }
        const result = await db.DemandePaiementVendeur.create(data);
        await db.NotificationVendeur.create({
          vendeur_email,
          titre: "Demande de paiement envoyée",
          message: `Votre demande de paiement de ${Math.round(data.montant || 0).toLocaleString('fr-FR')} FCFA a été transmise à l'équipe ZONITE.`,
          type: "paiement",
        });
        return Response.json({ success: true, result });
      }

      // ─── NOTIFICATION VENDEUR (marquer lue) ─────────────────────────────────
      case 'marquerNotificationLue': {
        // ✅ Vérifier que la notification appartient à ce vendeur
        const notif = await db.NotificationVendeur.filter({ id: payload.notifId });
        if (!notif.length || notif[0].vendeur_email !== vendeur_email) {
          return Response.json({ error: 'Notification introuvable ou non autorisée' }, { status: 403 });
        }
        const result = await db.NotificationVendeur.update(payload.notifId, { lue: true });
        return Response.json({ success: true, result });
      }

      case 'toutMarquerLu': {
        const { notifIds } = payload;
        // ✅ Vérifier que toutes les notifications appartiennent à ce vendeur
        const notifs = await db.NotificationVendeur.filter({ vendeur_email });
        const notifIdsAutorises = new Set(notifs.map(n => n.id));
        const idsValides = notifIds.filter(id => notifIdsAutorises.has(id));
        await Promise.all(idsValides.map(id => db.NotificationVendeur.update(id, { lue: true })));
        return Response.json({ success: true });
      }

      // ─── TICKET SUPPORT ──────────────────────────────────────────────────────
      case 'createTicketSupport': {
        // ✅ Forcer l'email depuis la session
        const ticketData = { ...payload.data, vendeur_email };
        const result = await db.TicketSupport.create(ticketData);
        return Response.json({ success: true, result });
      }

      case 'marquerTicketLu': {
        // ✅ Vérifier que le ticket appartient à ce vendeur
        const ticket = await db.TicketSupport.filter({ id: payload.ticketId });
        if (!ticket.length || ticket[0].vendeur_email !== vendeur_email) {
          return Response.json({ error: 'Ticket introuvable ou non autorisé' }, { status: 403 });
        }
        const result = await db.TicketSupport.update(payload.ticketId, { lu_par_vendeur: true });
        return Response.json({ success: true, result });
      }

      // ─── DÉBLOQUER CATALOGUE (après formation) ───────────────────────────────
      case 'debloquerCatalogue': {
        const { compteId } = payload;
        // ✅ Vérifier que le compteId appartient à ce vendeur
        if (compteAuth.id !== compteId) {
          return Response.json({ error: 'Compte non autorisé' }, { status: 403 });
        }
        const result = await db.Seller.update(compteId, {
          video_vue: true,
          conditions_acceptees: true,
          catalogue_debloque: true,
        });
        await db.NotificationVendeur.create({
          vendeur_email,
          titre: "Catalogue débloqué !",
          message: "Félicitations ! Vous avez accès au catalogue ZONITE.",
          type: "succes",
        });
        return Response.json({ success: true, result });
      }

      default:
        return Response.json({ error: `Action inconnue: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});