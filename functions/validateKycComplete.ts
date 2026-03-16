import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * VALIDATION KYC COMPLÈTE — active directement le vendeur (active_seller)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { seller_id, notes_admin } = await req.json();
    if (!seller_id) {
      return Response.json({ error: 'seller_id requis' }, { status: 400 });
    }

    const seller = await base44.asServiceRole.entities.Seller.get(seller_id);
    if (!seller) {
      return Response.json({ error: 'Vendeur introuvable' }, { status: 404 });
    }

    if (seller.statut_kyc === 'valide') {
      return Response.json({ success: true, message: 'KYC déjà validé', already_validated: true });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';

    await base44.asServiceRole.entities.Seller.update(seller_id, {
      statut_kyc: 'valide',
      statut: 'actif',
      seller_status: 'active_seller',
      notes_admin: notes_admin || 'KYC validé',
      email_verified: true
    });

    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: seller.email,
      titre: '🎉 Compte activé !',
      message: 'Votre KYC a été validé. Vous pouvez maintenant créer des commandes et gérer vos ventes.',
      type: 'succes',
      importante: true,
      lien: '/EspaceVendeur'
    }).catch(() => {});

    base44.integrations.Core.SendEmail({
      to: seller.email,
      subject: 'ZONITE - Compte activé !',
      body: `Bonjour ${seller.nom_complet},\n\nBonne nouvelle ! Votre compte ZONITE est maintenant actif.\n\nVous pouvez dès maintenant :\n- Créer des commandes pour vos clients\n- Suivre vos commissions\n- Gérer vos ventes\n\n👉 Connectez-vous : ${appUrl}/Connexion\n\nPour accéder au catalogue complet, visionnez la vidéo de formation ZONITE.\n\nL'équipe ZONITE`
    }).catch(() => {});

    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'KYC validé',
      module: 'vendeur',
      details: `KYC de ${seller.nom_complet} (${seller.email}) validé par ${user.email}`,
      utilisateur: user.email,
      entite_id: seller_id,
      donnees_avant: JSON.stringify({ statut_kyc: seller.statut_kyc, seller_status: seller.seller_status }),
      donnees_apres: JSON.stringify({ statut_kyc: 'valide', seller_status: 'active_seller' })
    }).catch(() => {});

    return Response.json({ success: true, message: 'KYC validé avec succès', seller_email: seller.email });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});