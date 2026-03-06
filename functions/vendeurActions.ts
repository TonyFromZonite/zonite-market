import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fonction centrale pour toutes les opérations vendeur nécessitant le service role.
 * action: nom de l'opération
 * payload: données de l'opération
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ✅ Authentification obligatoire
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (user.role !== 'vendeur') {
      return Response.json({ error: 'Accès refusé: rôle vendeur requis' }, { status: 403 });
    }

    const { action, payload } = await req.json();

    if (!action) {
      return Response.json({ error: 'action requise' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;

    switch (action) {

      // ─── DEMANDE PAIEMENT ────────────────────────────────────────────────────
      case 'createDemandePaiement': {
        const { data } = payload;
        // ✅ Vérification d'identité : l'email du payload doit correspondre à l'utilisateur connecté
        if (data.vendeur_email !== user.email) {
          return Response.json({ error: 'Accès refusé: impersonation non autorisée' }, { status: 403 });
        }
        const compte = await db.CompteVendeur.filter({ id: data.vendeur_id });
        if (!compte.length || compte[0].user_email !== user.email) {
          return Response.json({ error: 'Compte vendeur introuvable ou non autorisé' }, { status: 403 });
        }
        const result = await db.DemandePaiementVendeur.create(data);
        await db.NotificationVendeur.create({
          vendeur_email: data.vendeur_email,
          titre: "Demande de paiement envoyée",
          message: `Votre demande de paiement de ${Math.round(data.montant || 0).toLocaleString('fr-FR')} FCFA a été transmise à l'équipe ZONITE.`,
          type: "paiement",
        });
        return Response.json({ success: true, result });
      }

      // ─── NOTIFICATION VENDEUR (marquer lue) ─────────────────────────────────
      case 'marquerNotificationLue': {
        // ✅ Vérifier que la notification appartient à l'utilisateur
        const notif = await db.NotificationVendeur.filter({ id: payload.notifId });
        if (!notif.length || notif[0].vendeur_email !== user.email) {
          return Response.json({ error: 'Notification introuvable ou non autorisée' }, { status: 403 });
        }
        const result = await db.NotificationVendeur.update(payload.notifId, { lue: true });
        return Response.json({ success: true, result });
      }

      case 'toutMarquerLu': {
        const { notifIds } = payload;
        // ✅ Vérifier que toutes les notifications appartiennent à l'utilisateur
        const notifs = await db.NotificationVendeur.filter({ vendeur_email: user.email });
        const notifIdsAutorises = new Set(notifs.map(n => n.id));
        const idsValides = notifIds.filter(id => notifIdsAutorises.has(id));
        await Promise.all(idsValides.map(id => db.NotificationVendeur.update(id, { lue: true })));
        return Response.json({ success: true });
      }

      // ─── TICKET SUPPORT ──────────────────────────────────────────────────────
      case 'createTicketSupport': {
        // ✅ Forcer l'email depuis le token, pas depuis le payload
        const ticketData = { ...payload.data, vendeur_email: user.email };
        const result = await db.TicketSupport.create(ticketData);
        return Response.json({ success: true, result });
      }

      case 'marquerTicketLu': {
        // ✅ Vérifier que le ticket appartient à l'utilisateur
        const ticket = await db.TicketSupport.filter({ id: payload.ticketId });
        if (!ticket.length || ticket[0].vendeur_email !== user.email) {
          return Response.json({ error: 'Ticket introuvable ou non autorisé' }, { status: 403 });
        }
        const result = await db.TicketSupport.update(payload.ticketId, { lu_par_vendeur: true });
        return Response.json({ success: true, result });
      }

      // ─── DÉBLOQUER CATALOGUE (après formation) ───────────────────────────────
      case 'debloquerCatalogue': {
        const { compteId } = payload;
        // ✅ Vérifier que le compte appartient à l'utilisateur connecté
        const compte = await db.CompteVendeur.filter({ id: compteId });
        if (!compte.length || compte[0].user_email !== user.email) {
          return Response.json({ error: 'Compte non autorisé' }, { status: 403 });
        }
        const result = await db.CompteVendeur.update(compteId, {
          video_vue: true,
          conditions_acceptees: true,
          catalogue_debloque: true,
        });
        await db.NotificationVendeur.create({
          vendeur_email: user.email,
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