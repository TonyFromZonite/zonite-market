import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'Email requis' }, { status: 400 });
    }

    // Récupérer le vendeur
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length === 0) {
      return Response.json({ error: 'Compte non trouvé' }, { status: 404 });
    }

    const seller = sellers[0];

    // Générer un nouveau code (6 chiffres)
    const newCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 minutes

    // Mettre à jour le code
    await base44.asServiceRole.entities.Seller.update(seller.id, {
      verification_code: newCode,
      verification_code_expiry: expiryTime,
    });

    // Envoyer l'email
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🔐 Votre code de vérification ZONITE',
        body: `Bonjour ${seller.nom_complet},\n\nVotre code de vérification est : ${newCode}\n\nCe code expire dans 1 heure.\n\nSi vous n'avez pas demandé ce code, ignorez ce message.\n\nL'équipe ZONITE`
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
      throw new Error('Impossible d\'envoyer l\'email');
    }

    return Response.json({ 
      success: true, 
      message: 'Code de vérification envoyé par email'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});