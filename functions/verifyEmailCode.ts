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
 * EMAIL VERIFICATION (NEW ARCHITECTURE)
 * Verifies email code and transitions seller from pending_verification → kyc_required
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = body.email;
    const code = body.code || body.verification_code;

    if (!email || !code) {
      return Response.json({ 
        error: 'Email et code requis' 
      }, { status: 400 });
    }

    console.log(`📧 Verifying email for: ${email}`);

    // Get seller
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length === 0) {
      return Response.json({ 
        error: 'Aucun compte trouvé avec cet email' 
      }, { status: 404 });
    }

    const seller = sellers[0];

    // Check if already verified
    if (seller.email_verified) {
      return Response.json({ 
        success: true,
        message: 'Email déjà vérifié',
        seller_status: seller.seller_status
      });
    }

    // Verify code
    if (seller.verification_code !== code) {
      return Response.json({ 
        error: 'Code de vérification incorrect' 
      }, { status: 400 });
    }

    // Check expiry
    const now = new Date();
    const expiry = new Date(seller.verification_code_expiry);
    if (now > expiry) {
      return Response.json({ 
        error: 'Code expiré. Demandez un nouveau code.' 
      }, { status: 400 });
    }

    // Marquer email vérifié, forcer seller_status à kyc_required
    await base44.asServiceRole.entities.Seller.update(seller.id, {
      email_verified: true,
      verification_code: null,
      verification_code_expiry: null,
      seller_status: 'kyc_required'
    });

    console.log(`✅ Email verified for ${email}, status → kyc_required`);

    // Send notification
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: '✅ Email vérifié',
      message: 'Votre email a été vérifié avec succès. Veuillez soumettre votre dossier KYC pour continuer.',
      type: 'succes',
      importante: true
    }).catch(() => {});

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Email vérifié',
      module: 'vendeur',
      details: `Email vérifié pour ${seller.nom_complet} (${email})`,
      utilisateur: email,
      entite_id: seller.id
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Email vérifié avec succès',
      seller_status: 'kyc_required',
      next_step: 'Soumettez votre dossier KYC'
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});