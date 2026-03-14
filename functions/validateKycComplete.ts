import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * VALIDATION KYC COMPLÈTE
 * Active le vendeur et déclenche toutes les notifications
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

    // Récupérer le seller
    const seller = await base44.asServiceRole.entities.Seller.get(seller_id);
    if (!seller) {
      return Response.json({ error: 'Vendeur introuvable' }, { status: 404 });
    }

    if (seller.statut_kyc === 'valide') {
      return Response.json({ 
        success: true, 
        message: 'KYC déjà validé',
        already_validated: true
      });
    }

    console.log(`✅ Validation KYC: ${seller.email}`);

    // Mettre à jour le statut
    await base44.asServiceRole.entities.Seller.update(seller_id, {
      statut_kyc: 'valide',
      statut: 'actif',
      video_vue: true,
      conditions_acceptees: true,
      catalogue_debloque: true,
      notes_admin: notes_admin || 'KYC validé'
    });

    // Notification in-app
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: seller.email,
      titre: '🎉 KYC Validé - Compte Activé !',
      message: 'Félicitations ! Votre dossier KYC a été validé. Vous pouvez maintenant accéder au catalogue complet et commencer à vendre.',
      type: 'succes',
      importante: true,
      lien: '/EspaceVendeur'
    }).catch(() => {});

    // Email
    base44.integrations.Core.SendEmail({
      to: seller.email,
      subject: '🎉 KYC Validé - Bienvenue chez ZONITE !',
      body: `Bonjour ${seller.nom_complet},\n\nExcellente nouvelle ! 🎉\n\nVotre dossier KYC a été validé par notre équipe.\n\nVotre compte vendeur est maintenant ACTIF.\n\nVous pouvez :\n✅ Accéder au catalogue complet\n✅ Passer des commandes\n✅ Gagner des commissions\n\nConnectez-vous dès maintenant pour découvrir nos produits.\n\nBon courage et excellentes ventes !\n\nL'équipe ZONITE`
    }).catch(e => console.warn('Email failed:', e.message));

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'KYC validé',
      module: 'vendeur',
      details: `KYC de ${seller.nom_complet} (${seller.email}) validé par ${user.email}`,
      utilisateur: user.email,
      entite_id: seller_id,
      donnees_avant: JSON.stringify({
        statut: seller.statut,
        statut_kyc: seller.statut_kyc
      }),
      donnees_apres: JSON.stringify({
        statut: 'actif',
        statut_kyc: 'valide'
      })
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'KYC validé avec succès',
      seller_email: seller.email,
      notifications_envoyees: true
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});