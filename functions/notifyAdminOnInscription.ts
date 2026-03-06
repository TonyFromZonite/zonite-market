import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // STRICT: Vérifier que l'appel vient d'une automation CandidatureVendeur + create event
    // Structure garantie des automations: event.type, event.entity_name, event.entity_id, data
    const isValidAutomation = 
      payload.event && 
      typeof payload.event === 'object' && 
      payload.event.type === 'create' &&
      payload.event.entity_name === 'CandidatureVendeur' &&
      payload.event.entity_id &&
      payload.data &&
      typeof payload.data === 'object';
    
    if (!isValidAutomation) {
      return Response.json({ error: 'Unauthorized: Invalid automation context' }, { status: 401 });
    }

    const { vendeur_id, vendeur_nom, vendeur_email } = payload.data || payload;

    if (!vendeur_id || !vendeur_nom || !vendeur_email) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Valider email
    if (!vendeur_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Créer une notification pour tous les admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
    
    for (const admin of admins) {
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: admin.email,
        titre: "📋 Nouvelle candidature KYC",
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
      subject: `🔔 Nouvelle candidature KYC - ${vendeur_nom}`,
      body: `Une nouvelle demande d'inscription a été reçue de ${vendeur_nom} (${vendeur_email}).\n\nVeuillez vérifier et valider/rejeter le dossier KYC rapidement.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});