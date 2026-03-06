import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fonction centrale pour toutes les opérations d'écriture côté vendeur.
 * Utilise asServiceRole pour bypasser les RLS tout en vérifiant les droits au niveau applicatif.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, payload } = await req.json();

    if (!action) {
      return Response.json({ error: 'action requise' }, { status: 400 });
    }

    // Vérifier l'authentification pour toutes les actions
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const db = base44.asServiceRole.entities;

    switch (action) {

      // ─── DEMANDE PAIEMENT ────────────────────────────────────────────────────
      case 'createDemandePaiement': {
        // Vérifier que le vendeur crée sa propre demande
        if (payload.data.vendeur_email !== user.email) {
          return Response.json({ error: 'Interdit' }, { status: 403 });
        }
        const result = await db.DemandePaiementVendeur.create(payload.data);
        // Notification automatique
        await db.NotificationVendeur.create({
          vendeur_email: user.email,
          titre: "Demande de paiement envoyée",
          message: `Votre demande de paiement de ${Math.round(payload.data.montant || 0).toLocaleString('fr-FR')} FCFA a été transmise à l'équipe ZONITE.`,
          type: "paiement",
        });
        return Response.json({ success: true, result });
      }

      // ─── NOTIFICATION VENDEUR ────────────────────────────────────────────────
      case 'marquerNotificationLue': {
        // Vérifier que la notification appartient au vendeur
        const notif = await db.NotificationVendeur.get(payload.notifId);
        if (!notif || notif.vendeur_email !== user.email) {
          return Response.json({ error: 'Interdit' }, { status: 403 });
        }
        const result = await db.NotificationVendeur.update(payload.notifId, { lue: true });
        return Response.json({ success: true, result });
      }

      case 'marquerToutesNotificationsLues': {
        // Récupérer toutes les notifs non lues du vendeur
        const nonLues = await db.NotificationVendeur.filter({
          vendeur_email: user.email,
          lue: false,
        });
        await Promise.all(nonLues.map(n => db.NotificationVendeur.update(n.id, { lue: true })));
        return Response.json({ success: true, count: nonLues.length });
      }

      // ─── TICKET SUPPORT ──────────────────────────────────────────────────────
      case 'createTicketSupport': {
        if (payload.data.vendeur_email !== user.email) {
          return Response.json({ error: 'Interdit' }, { status: 403 });
        }
        const result = await db.TicketSupport.create(payload.data);
        return Response.json({ success: true, result });
      }

      case 'marquerTicketLu': {
        const ticket = await db.TicketSupport.get(payload.ticketId);
        if (!ticket || ticket.vendeur_email !== user.email) {
          return Response.json({ error: 'Interdit' }, { status: 403 });
        }
        const result = await db.TicketSupport.update(payload.ticketId, { lu_par_vendeur: true });
        return Response.json({ success: true, result });
      }

      // ─── FORMATION / DÉBLOCAGE CATALOGUE ─────────────────────────────────────
      case 'validerFormationEtDebloquerCatalogue': {
        const comptes = await db.CompteVendeur.filter({ user_email: user.email });
        if (!comptes.length) {
          return Response.json({ error: 'Compte vendeur introuvable' }, { status: 404 });
        }
        const compte = comptes[0];
        if (compte.user_email !== user.email) {
          return Response.json({ error: 'Interdit' }, { status: 403 });
        }
        await Promise.all([
          db.CompteVendeur.update(compte.id, {
            video_vue: true,
            conditions_acceptees: true,
            catalogue_debloque: true,
          }),
          db.NotificationVendeur.create({
            vendeur_email: user.email,
            titre: "Catalogue débloqué !",
            message: "Félicitations ! Vous avez accès au catalogue ZONITE.",
            type: "succes",
          }),
        ]);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: `Action inconnue: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in vendeurActions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});