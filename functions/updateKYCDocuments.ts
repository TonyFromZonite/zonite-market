import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TRANSITIONS_AUTORISEES = {
  'pending_verification': ['kyc_required'],
  'kyc_required': ['kyc_pending'],
  'kyc_pending': ['kyc_approved_training_required', 'kyc_required'],
  'kyc_approved_training_required': ['active_seller'],
  'active_seller': []
};

function validateStatusTransition(actuel, nouveau) {
  const autorisees = TRANSITIONS_AUTORISEES[actuel] || [];
  if (!autorisees.includes(nouveau)) {
    throw new Error(`Transition interdite: ${actuel} → ${nouveau}`);
  }
}

/**
 * KYC DOCUMENT SUBMISSION (NEW ARCHITECTURE)
 * Transitions seller from kyc_required → kyc_pending
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      email,
      photo_identite_url,
      photo_identite_verso_url,
      selfie_url
    } = await req.json();

    if (!email || !photo_identite_url || !selfie_url) {
      return Response.json({ 
        error: 'Email, photo d\'identité et selfie requis' 
      }, { status: 400 });
    }

    console.log(`📋 KYC submission for: ${email}`);

    // Get seller
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length === 0) {
      return Response.json({ 
        error: 'Vendeur non trouvé' 
      }, { status: 404 });
    }

    const seller = sellers[0];

    // Prevent re-submission if already pending or approved
    if (['kyc_pending', 'kyc_approved_training_required', 'active_seller'].includes(seller.seller_status)) {
      return Response.json({ 
        error: 'KYC déjà soumis ou validé' 
      }, { status: 400 });
    }

    // TRANSITION: kyc_required → kyc_pending
    validateStatusTransition(seller.seller_status, 'kyc_pending');
    await base44.asServiceRole.entities.Seller.update(seller.id, {
      photo_identite_url,
      photo_identite_verso_url: photo_identite_verso_url || '',
      selfie_url,
      statut_kyc: 'en_attente',
      seller_status: 'kyc_pending'
    });

    console.log(`✅ KYC submitted for ${email}, status → kyc_pending`);

    // Send notification to seller
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: '📋 KYC soumis',
      message: 'Votre dossier KYC a été soumis avec succès. Vous recevrez une notification une fois validé par nos équipes.',
      type: 'info',
      importante: true
    }).catch(() => {});

    // Notifier les admins via NotificationVendeur (affichée dans le tableau de bord admin)
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of admins) {
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: admin.email,
        titre: '📋 Nouveau KYC à valider',
        message: `${seller.nom_complet} (${email}) a soumis son dossier KYC. Cliquez pour valider.`,
        type: 'alerte',
        importante: true,
        lien: '/GestionKYC'
      }).catch(() => {});
    }
    // Email admin
    base44.integrations.Core.SendEmail({
      to: admins[0]?.email || 'admin@zonite.cm',
      subject: '🆕 Nouveau dossier KYC à valider - ZONITE',
      body: `Un nouveau dossier KYC a été soumis par ${seller.nom_complet} (${email}).\n\nConnectez-vous au tableau de bord pour le valider.`
    }).catch(() => {});

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'KYC soumis',
      module: 'vendeur',
      details: `Dossier KYC soumis par ${seller.nom_complet} (${email})`,
      utilisateur: email,
      entite_id: seller.id
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Dossier KYC soumis avec succès',
      seller_status: 'kyc_pending',
      next_step: 'En attente de validation par l\'équipe ZONITE'
    });

  } catch (error) {
    console.error('❌ KYC submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});