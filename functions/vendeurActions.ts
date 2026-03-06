import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fonction centrale pour toutes les opérations vendeur nécessitant le service role.
 * action: nom de l'opération
 * payload: données de l'opération
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, payload } = await req.json();

    if (!action) {
      return Response.json({ error: 'action requise' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;

    switch (action) {

      // ─── DEMANDE PAIEMENT ────────────────────────────────────────────────────
      case 'createDemandePaiement': {
        // Vérification : le vendeur ne peut créer une demande que pour lui-même
        const { data } = payload;
        const compte = await db.CompteVendeur.filter({ id: data.vendeur_id });
        if (!compte.length) {
          return Response.json({ error: 'Compte vendeur introuvable' }, { status: 404 });
        }
        const result = await db.DemandePaiementVendeur.create(data);
        // Notification automatique
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
        const result = await db.NotificationVendeur.update(payload.notifId, { lue: true });
        return Response.json({ success: true, result });
      }

      case 'toutMarquerLu': {
        const { notifIds } = payload;
        await Promise.all(notifIds.map(id => db.NotificationVendeur.update(id, { lue: true })));
        return Response.json({ success: true });
      }

      // ─── TICKET SUPPORT ──────────────────────────────────────────────────────
      case 'createTicketSupport': {
        const result = await db.TicketSupport.create(payload.data);
        return Response.json({ success: true, result });
      }

      case 'marquerTicketLu': {
        const result = await db.TicketSupport.update(payload.ticketId, { lu_par_vendeur: true });
        return Response.json({ success: true, result });
      }

      // ─── DÉBLOQUER CATALOGUE (après formation) ───────────────────────────────
      case 'debloquerCatalogue': {
        const { compteId, vendeur_email } = payload;
        const result = await db.CompteVendeur.update(compteId, {
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