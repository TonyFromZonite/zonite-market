import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, verification_code } = body;

    if (!email || !verification_code) {
      return Response.json({ error: 'Email et code requis' }, { status: 400 });
    }

    // Récupérer le vendeur
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length === 0) {
      return Response.json({ error: 'Compte non trouvé' }, { status: 404 });
    }

    const seller = sellers[0];

    // Vérifier le code et l'expiration
    if (!seller.verification_code || seller.verification_code !== verification_code) {
      return Response.json({ error: 'Code incorrect' }, { status: 400 });
    }

    if (seller.verification_code_expiry && new Date(seller.verification_code_expiry) < new Date()) {
      return Response.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 });
    }

    // Marquer comme vérifié, transition to kyc_required, et créer l'utilisateur Base44
    let userCreated = false;
    
    // Créer l'utilisateur Base44 avec rôle 'user' - MUST happen first
    try {
      await base44.users.inviteUser(email, 'user');
      userCreated = true;
      console.log(`✅ Utilisateur Base44 créé pour ${email}`);
    } catch (userError) {
      if (!userError.message.includes('already exists')) {
        console.error('❌ Erreur création utilisateur Base44:', userError.message);
        throw userError;
      }
      userCreated = true;
      console.log(`ℹ️ Utilisateur Base44 existe déjà pour ${email}`);
    }

    // Update seller: mark email verified and transition status
    await base44.asServiceRole.entities.Seller.update(seller.id, {
      email_verified: true,
      verification_code: null,
      verification_code_expiry: null,
      seller_status: 'kyc_required', // Transition: pending_verification → kyc_required
      statut_kyc: 'en_attente',
      statut: 'en_attente_kyc'
    });

    // Notification
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '✅ Email vérifié - ZONITE',
        body: `Bonjour ${seller.nom_complet},\n\nVotre email a été vérifié avec succès ! 🎉\n\nVous pouvez maintenant vous connecter à votre compte ZONITE.\n\nBon courage !\nL'équipe ZONITE`
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

    return Response.json({ 
      success: true, 
      message: 'Email vérifié avec succès',
      user_created: userCreated
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});