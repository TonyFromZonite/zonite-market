import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TRANSITIONS_AUTORISEES = {
  'pending_verification': ['kyc_required'],
  'kyc_required': ['kyc_pending'],
  'kyc_pending': ['active_seller', 'kyc_required'],
  'active_seller': []
};

function validateStatusTransition(actuel, nouveau) {
  const autorisees = TRANSITIONS_AUTORISEES[actuel] || [];
  if (!autorisees.includes(nouveau)) {
    throw new Error(`Transition interdite: ${actuel} → ${nouveau}`);
  }
}

/**
 * KYC VALIDATION BY ADMIN
 * - If approved: kyc_pending → active_seller
 * - If rejected: kyc_pending → kyc_required
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
      return Response.json({ error: 'seller_id et statut requis' }, { status: 400 });
    }

    if (!['valide', 'rejete'].includes(statut)) {
      return Response.json({ error: 'statut doit être "valide" ou "rejete"' }, { status: 400 });
    }

    const sellers = await base44.asServiceRole.entities.Seller.filter({ id: seller_id });
    if (sellers.length === 0) {
      return Response.json({ error: 'Vendeur non trouvé' }, { status: 404 });
    }

    const seller = sellers[0];
    const appUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';

    if (statut === 'valide') {
      validateStatusTransition(seller.seller_status, 'active_seller');
      await base44.asServiceRole.entities.Seller.update(seller_id, {
        statut_kyc: 'valide',
        seller_status: 'active_seller',
        statut: 'actif',
        notes_admin: notes || ''
      });

      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: seller.email,
        titre: '🎉 Compte activé !',
        message: 'Votre KYC a été validé. Vous pouvez maintenant créer des commandes et gérer vos ventes.',
        type: 'succes',
        importante: true
      }).catch(() => {});

      base44.integrations.Core.SendEmail({
        to: seller.email,
        subject: 'ZONITE - Compte activé !',
        body: `Bonjour ${seller.nom_complet},\n\nBonne nouvelle ! Votre compte ZONITE est maintenant actif.\n\nVous pouvez dès maintenant :\n- Créer des commandes pour vos clients\n- Suivre vos commissions\n- Gérer vos ventes\n\n👉 Connectez-vous : ${appUrl}/Connexion\n\nPour accéder au catalogue complet, visionnez la vidéo de formation ZONITE.\n\nL'équipe ZONITE`
      }).catch(() => {});

    } else {
      validateStatusTransition(seller.seller_status, 'kyc_required');
      await base44.asServiceRole.entities.Seller.update(seller_id, {
        statut_kyc: 'rejete',
        seller_status: 'kyc_required',
        notes_admin: notes || ''
      });

      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: seller.email,
        titre: '❌ KYC Rejeté',
        message: `Votre dossier KYC a été rejeté. Raison : ${notes || 'Non spécifiée'}. Veuillez soumettre un nouveau dossier.`,
        type: 'alerte',
        importante: true
      }).catch(() => {});

      base44.integrations.Core.SendEmail({
        to: seller.email,
        subject: 'ZONITE - KYC Rejeté',
        body: `Bonjour ${seller.nom_complet},\n\nMalheureusement, votre dossier KYC a été rejeté.\n\nRaison : ${notes || 'Non spécifiée'}\n\nVeuillez soumettre un nouveau dossier avec des documents conformes.\n\nCordialement,\nL'équipe ZONITE`
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.JournalAudit.create({
      action: statut === 'valide' ? 'KYC validé' : 'KYC rejeté',
      module: 'vendeur',
      details: `KYC ${statut} pour ${seller.nom_complet} (${seller.email}) par ${user.email}`,
      utilisateur: user.email,
      entite_id: seller_id,
      donnees_apres: JSON.stringify({
        statut_kyc: statut,
        seller_status: statut === 'valide' ? 'active_seller' : 'kyc_required',
        notes
      })
    }).catch(() => {});

    return Response.json({
      success: true,
      message: statut === 'valide' ? 'KYC validé avec succès' : 'KYC rejeté',
      seller_status: statut === 'valide' ? 'active_seller' : 'kyc_required'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});