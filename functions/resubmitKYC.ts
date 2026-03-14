import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const {
      photo_identite_url,
      photo_identite_verso_url,
      selfie_url,
    } = body;

    if (!photo_identite_url) {
      return Response.json({ error: 'La pièce d\'identité est obligatoire' }, { status: 400 });
    }

    // Récupérer le vendeur associé à cet utilisateur
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email: user.email });
    if (sellers.length === 0) {
      return Response.json({ error: 'Vendeur non trouvé' }, { status: 404 });
    }

    const seller = sellers[0];

    // Vérifier que le vendeur est dans un statut "rejeté"
    if (seller.statut_kyc !== 'rejete') {
      return Response.json({ error: 'Vous ne pouvez resoumettreque si votre dossier a été rejeté.' }, { status: 400 });
    }

    // Mettre à jour avec les nouveaux documents et retourner à "en_attente"
    await base44.asServiceRole.entities.Seller.update(seller.id, {
      photo_identite_url,
      photo_identite_verso_url: photo_identite_verso_url || '',
      selfie_url,
      statut_kyc: 'en_attente',
      statut: 'en_attente_kyc',
      notes_admin: '', // Réinitialiser les notes
    });

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'KYC resoumis',
      module: 'vendeur',
      details: `${seller.nom_complet} (${seller.email}) a resoumis son dossier KYC`,
      utilisateur: user.email,
      entite_id: seller.id,
    }).catch(() => {});

    // Notification in-app
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: user.email,
      titre: '📝 Dossier KYC resoumis',
      message: 'Merci ! Votre dossier a été resoumis. Notre équipe l\'examinera et vous contactera dès que possible.',
      type: 'info',
    }).catch(() => {});

    // Email de confirmation
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '✅ Votre dossier KYC a été resoumis',
        body: `Bonjour ${seller.nom_complet},\n\nMerci de votre resoumission ! 📝\n\nVotre dossier KYC a été reçu et est maintenant en cours de vérification. Notre équipe examinera vos documents et vous contactera dès que possible.\n\nBon courage !\n\nL'équipe ZONITE`
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

    return Response.json({
      success: true,
      message: 'Dossier resoumis avec succès. Vérification en cours.',
      seller_id: seller.id,
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});