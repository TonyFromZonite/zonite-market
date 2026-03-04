import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // STRICT: Vérifier que l'appel vient d'une automation CommandeVendeur + update event
    // Structure garantie des automations: event.type, event.entity_name, event.entity_id, data
    const isValidAutomation = 
      event && 
      typeof event === 'object' && 
      event.type === 'update' &&
      event.entity_name === 'CommandeVendeur' &&
      event.entity_id &&
      data &&
      typeof data === 'object' &&
      data.vendeur_email && // Vérifier que le vendeur email existe dans data
      data.produit_nom;
    
    if (!isValidAutomation) {
      return Response.json({ error: 'Unauthorized: Invalid automation context' }, { status: 401 });
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
      
      // Vérifier que la notification n'existe pas (éviter doublons)
      const existing = await base44.asServiceRole.entities.NotificationVendeur.filter({
        vendeur_email: data.vendeur_email,
        titre: "Commande mise à jour",
        lue: false
      });
      
      const recentNotif = existing.find(n => 
        n.message.includes(data.produit_nom) && 
        new Date(n.created_date).getTime() > Date.now() - 60000 // moins de 1 min
      );

      if (!recentNotif) {
        await base44.asServiceRole.entities.NotificationVendeur.create({
          vendeur_email: data.vendeur_email,
          titre: `Commande mise à jour`,
          message: `${data.produit_nom} - Statut: ${nouveau_statut}`,
          type: data.statut === "livree" ? "succes" : data.statut === "echec_livraison" ? "alerte" : "info",
          lien: `/MesCommandesVendeur?cmd_id=${event.entity_id}`,
          lue: false,
        });
      }

      // Email au vendeur
      const messages = {
        validee_admin: "Votre commande a été validée par l'admin et sera traitée.",
        attribuee_livreur: "Un livreur a été assigné à votre commande.",
        en_livraison: "Votre commande est actuellement en cours de livraison.",
        livree: "Félicitations! Votre commande a été livrée avec succès.",
        echec_livraison: "La livraison a échoué. L'admin vous contactera.",
        annulee: "Votre commande a été annulée.",
      };

      // Envoyer email (non-bloquante - catch errors)
      try {
        await base44.integrations.Core.SendEmail({
          to: data.vendeur_email,
          subject: `📦 Mise à jour commande - ${data.produit_nom}`,
          body: `Bonjour,\n\n${messages[data.statut] || "Votre commande a été mise à jour."}\n\nDétails:\n- Produit: ${data.produit_nom}\n- Quantité: ${data.quantite}\n- Client: ${data.client_nom}\n\nCordialement,\nL'équipe ZONITE`,
        });
      } catch (emailErr) {
        console.error('Email send failed (non-blocking):', emailErr.message);
        // Notification in-app est créée, email échoué ok
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});