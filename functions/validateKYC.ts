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
 * KYC VALIDATION BY ADMIN (NEW ARCHITECTURE)
 * Transitions seller:
 * - If approved: kyc_pending → kyc_approved_training_required
 * - If rejected: kyc_pending → kyc_required (can resubmit)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { seller_id, statut, notes } = await req.json();

    if (!seller_id || !statut) {
      return Response.json({ 
        error: 'seller_id et statut requis' 
      }, { status: 400 });
    }

    if (!['valide', 'rejete'].includes(statut)) {
      return Response.json({ 
        error: 'statut doit être "valide" ou "rejete"' 
      }, { status: 400 });
    }

    console.log(`📋 KYC validation for seller ${seller_id}: ${statut}`);

    // Get seller
    const sellers = await base44.asServiceRole.entities.Seller.filter({ id: seller_id });
    if (sellers.length === 0) {
      return Response.json({ 
        error: 'Vendeur non trouvé' 
      }, { status: 404 });
    }

    const seller = sellers[0];

    if (statut === 'valide') {
      // TRANSITION: kyc_pending → kyc_approved_training_required
      validateStatusTransition(seller.seller_status, 'kyc_approved_training_required');
      await base44.asServiceRole.entities.Seller.update(seller_id, {
        statut_kyc: 'valide',
        seller_status: 'kyc_approved_training_required',
        statut: 'actif',
        notes_admin: notes || ''
      });

      console.log(`✅ KYC approved for ${seller.email}, status → kyc_approved_training_required`);

      // Notification to seller
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: seller.email,
        titre: '✅ KYC Validé !',
        message: 'Félicitations ! Votre dossier KYC a été validé. Veuillez regarder la vidéo de formation pour débloquer le catalogue.',
        type: 'succes',
        importante: true
      }).catch(() => {});

      // Email to seller
      base44.integrations.Core.SendEmail({
        to: seller.email,
        subject: '✅ KYC Validé - ZONITE',
        body: `Bonjour ${seller.nom_complet},\n\nFélicitations ! 🎉\n\nVotre dossier KYC a été validé avec succès.\n\n📹 PROCHAINE ÉTAPE : Regardez la vidéo de formation obligatoire pour débloquer l'accès au catalogue.\n\nConnectez-vous à votre espace vendeur pour continuer.\n\nBonne vente !\nL'équipe ZONITE`
      }).catch(() => {});

    } else {
      // TRANSITION: kyc_pending → kyc_required (can resubmit)
      await base44.asServiceRole.entities.Seller.update(seller_id, {
        statut_kyc: 'rejete',
        seller_status: 'kyc_required',
        notes_admin: notes || ''
      });

      console.log(`❌ KYC rejected for ${seller.email}, status → kyc_required`);

      // Notification to seller
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: seller.email,
        titre: '❌ KYC Rejeté',
        message: `Votre dossier KYC a été rejeté. Raison : ${notes || 'Non spécifiée'}. Veuillez soumettre un nouveau dossier.`,
        type: 'alerte',
        importante: true
      }).catch(() => {});

      // Email to seller
      base44.integrations.Core.SendEmail({
        to: seller.email,
        subject: '❌ KYC Rejeté - ZONITE',
        body: `Bonjour ${seller.nom_complet},\n\nMalheureusement, votre dossier KYC a été rejeté.\n\nRaison : ${notes || 'Non spécifiée'}\n\nVeuillez soumettre un nouveau dossier avec des documents conformes.\n\nConnectez-vous à votre espace vendeur pour soumettre à nouveau.\n\nCordialement,\nL'équipe ZONITE`
      }).catch(() => {});
    }

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: statut === 'valide' ? 'KYC validé' : 'KYC rejeté',
      module: 'vendeur',
      details: `KYC ${statut} pour ${seller.nom_complet} (${seller.email}) par ${user.email}`,
      utilisateur: user.email,
      entite_id: seller_id,
      donnees_apres: JSON.stringify({
        statut_kyc: statut,
        seller_status: statut === 'valide' ? 'kyc_approved_training_required' : 'kyc_required',
        notes
      })
    }).catch(() => {});

    return Response.json({
      success: true,
      message: statut === 'valide' ? 'KYC validé avec succès' : 'KYC rejeté',
      seller_status: statut === 'valide' ? 'kyc_approved_training_required' : 'kyc_required'
    });

  } catch (error) {
    console.error('❌ KYC validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});