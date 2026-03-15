import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * UPDATE KYC DOCUMENTS FOR EXISTING SELLER
 * Receives KYC documents and transitions status to kyc_pending
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, photo_identite_url, photo_identite_verso_url, selfie_url } = body;

    if (!email || !photo_identite_url || !selfie_url) {
      return Response.json({
        error: 'Email, photo_identite_url, et selfie_url sont requis'
      }, { status: 400 });
    }

    // Récupérer le seller existant
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length === 0) {
      return Response.json({ error: 'Seller non trouvé' }, { status: 404 });
    }

    const seller = sellers[0];

    // Vérifier que le vendeur n'a pas déjà soumis de KYC
    if (seller.seller_status && ['kyc_pending', 'kyc_approved_training_required', 'active_seller'].includes(seller.seller_status)) {
      return Response.json({
        error: 'Vous avez déjà soumis votre dossier KYC. Veuillez attendre la validation par notre équipe.'
      }, { status: 400 });
    }

    // Mettre à jour avec les documents KYC et transition to kyc_pending
    const updates = {
      photo_identite_url,
      photo_identite_verso_url: photo_identite_verso_url || '',
      selfie_url,
      statut_kyc: 'en_attente', // Maintenant en attente de validation
      seller_status: 'kyc_pending', // NEW: Proper status transition
      conditions_acceptees: true
    };

    const updatedSeller = await base44.asServiceRole.entities.Seller.update(seller.id, updates);

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Soumission KYC',
      module: 'vendeur',
      details: `Dossier KYC soumis par ${seller.nom_complet} (${email})`,
      utilisateur: email,
      entite_id: seller.id,
      donnees_apres: JSON.stringify({
        seller_status: 'kyc_pending',
        statut_kyc: 'en_attente'
      })
    }).catch(() => {});

    return Response.json({
      success: true,
      seller_id: seller.id,
      message: 'Dossier KYC soumis avec succès. Veuillez attendre la validation par notre équipe.'
    });
  } catch (error) {
    console.error('Error updating KYC documents:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});