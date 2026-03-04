import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Vérifier que l'appel vient du système (automation)
    // Les automations ont un event type défini
    if (!event || !event.type) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Notifier vendeur seulement si le statut change
    if (event.type === "update" && data && old_data && data.statut !== old_data.statut) {
      const statusLabels = {
        validee_admin: "✅ Validée par l'admin",
        attribuee_livreur: "🚚 Assignée au livreur",
        en_livraison: "📦 En cours de livraison",
        livree: "🎉 Livrée avec succès",
        echec_livraison: "❌ Livraison échouée",
        annulee: "🚫 Annulée",
      };

      const nouveau_statut = statusLabels[data.statut] || data.statut;
      
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: data.vendeur_email,
        titre: `Commande mise à jour`,
        message: `${data.produit_nom} - Statut: ${nouveau_statut}`,
        type: data.statut === "livree" ? "succes" : data.statut === "echec_livraison" ? "alerte" : "info",
        lien: `/MesCommandesVendeur?cmd_id=${event.entity_id}`,
        lue: false,
      });

      // Email au vendeur
      const messages = {
        validee_admin: "Votre commande a été validée par l'admin et sera traitée.",
        attribuee_livreur: "Un livreur a été assigné à votre commande.",
        en_livraison: "Votre commande est actuellement en cours de livraison.",
        livree: "Félicitations! Votre commande a été livrée avec succès.",
        echec_livraison: "La livraison a échoué. L'admin vous contactera.",
        annulee: "Votre commande a été annulée.",
      };

      await base44.integrations.Core.SendEmail({
        to: data.vendeur_email,
        subject: `📦 Mise à jour commande - ${data.produit_nom}`,
        body: `Bonjour,\n\n${messages[data.statut] || "Votre commande a été mise à jour."}\n\nDétails:\n- Produit: ${data.produit_nom}\n- Quantité: ${data.quantite}\n- Client: ${data.client_nom}\n\nCordialement,\nL'équipe ZONITE`,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});