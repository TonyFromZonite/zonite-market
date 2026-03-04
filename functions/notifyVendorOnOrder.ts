import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { vendeur_email, vendeur_nom, produit_nom, quantite, client_nom, commande_id } = await req.json();

    if (!vendeur_email || !produit_nom || !quantite) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Créer une notification pour le vendeur
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: vendeur_email,
      titre: "🆕 Nouvelle commande reçue",
      message: `Commande de ${client_nom || "client"}: ${quantite} × ${produit_nom}`,
      type: "succes",
      lien: `/MesCommandesVendeur?cmd_id=${commande_id}`,
      lue: false,
    });

    // Email de confirmation au vendeur
    await base44.integrations.Core.SendEmail({
      to: vendeur_email,
      subject: `✅ Nouvelle commande - ${produit_nom}`,
      body: `Bonjour ${vendeur_nom},\n\nVotre commande a été reçue:\n- Produit: ${produit_nom}\n- Quantité: ${quantite}\n- Client: ${client_nom || "Non spécifié"}\n\nVérifiez les détails dans votre espace vendeur.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});