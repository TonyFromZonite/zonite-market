import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Vérifier que l'appel vient du système (automation) ou d'un admin authentifié
    let isAuthorized = false;
    
    // Vérifier si automation (contexte spécial)
    const payload = await req.json();
    if (payload.event && payload.event.type) {
      // C'est un appel d'automation, autorisé
      isAuthorized = true;
    } else {
      // Vérifier authentification utilisateur
      const user = await base44.auth.me().catch(() => null);
      isAuthorized = user?.role === 'admin';
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendeur_id, vendeur_nom, vendeur_email } = payload;

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