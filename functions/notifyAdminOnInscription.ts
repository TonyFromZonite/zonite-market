import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Vérifier que l'appel vient d'une automation CompteVendeur + create event
    const isValidAutomation = 
      payload.event && 
      typeof payload.event === 'object' && 
      payload.event.type === 'create' &&
      payload.event.entity_name === 'CompteVendeur' &&
      payload.event.entity_id;
    
    if (!isValidAutomation) {
      return Response.json({ error: 'Unauthorized: Invalid automation context' }, { status: 401 });
    }

    // Récupérer les données du CompteVendeur depuis la DB si non fournies
    let compteData = payload.data;
    if (!compteData || payload.payload_too_large) {
      compteData = await base44.asServiceRole.entities.CompteVendeur.get(payload.event.entity_id);
    }

    const vendeur_id = payload.event.entity_id;
    const vendeur_nom = compteData?.nom_complet;
    const vendeur_email = compteData?.user_email;

    if (!vendeur_nom || !vendeur_email) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Créer une notification pour tous les admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
    
    for (const admin of admins) {
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: admin.email,
        titre: "📋 Nouvelle inscription vendeur KYC",
        message: `${vendeur_nom} a soumis sa demande de validation KYC`,
        type: "alerte",
        importante: true,
        lien: `/GestionKYC?vendeur_id=${vendeur_id}`,
        lue: false,
      });
    }

    // Email aux admins
    const adminEmails = admins.map(a => a.email).join(",");
    await base44.integrations.Core.SendEmail({
      to: adminEmails,
      subject: `🔔 Nouvelle inscription KYC - ${vendeur_nom}`,
      body: `Une nouvelle demande d'inscription a été reçue de ${vendeur_nom} (${vendeur_email}).\n\nVeuillez vérifier et valider/rejeter le dossier KYC rapidement.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});