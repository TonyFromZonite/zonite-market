import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * TRAINING COMPLETION (NEW ARCHITECTURE)
 * Transitions seller: kyc_approved_training_required → active_seller
 * Unlocks catalog and all features
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ 
        error: 'Email requis' 
      }, { status: 400 });
    }

    console.log(`📹 Training completion for: ${email}`);

    // Get seller
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length === 0) {
      return Response.json({ 
        error: 'Vendeur non trouvé' 
      }, { status: 404 });
    }

    const seller = sellers[0];

    // Verify seller is at training stage
    if (seller.seller_status !== 'kyc_approved_training_required') {
      return Response.json({ 
        error: 'Formation non disponible pour ce statut',
        current_status: seller.seller_status
      }, { status: 400 });
    }

    // Check if already completed
    if (seller.training_completed) {
      return Response.json({ 
        success: true,
        message: 'Formation déjà validée',
        seller_status: seller.seller_status
      });
    }

    // TRANSITION: kyc_approved_training_required → active_seller
    await base44.asServiceRole.entities.Seller.update(seller.id, {
      training_completed: true,
      video_vue: true,
      conditions_acceptees: true,
      catalogue_debloque: true,
      seller_status: 'active_seller',
      statut: 'actif'
    });

    console.log(`✅ Training completed for ${email}, status → active_seller`);

    // Send notification
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: '🎉 Formation Terminée !',
      message: 'Félicitations ! Vous avez terminé la formation. Vous pouvez maintenant accéder au catalogue et commencer à vendre.',
      type: 'succes',
      importante: true
    }).catch(() => {});

    // Email to seller
    base44.integrations.Core.SendEmail({
      to: email,
      subject: '🎉 Formation Terminée - ZONITE',
      body: `Bonjour ${seller.nom_complet},\n\nFélicitations ! 🎉\n\nVous avez terminé la formation avec succès.\n\nVous avez maintenant un accès complet à :\n✅ Catalogue produits\n✅ Passer des commandes\n✅ Gérer vos ventes\n✅ Suivre vos commissions\n\nBienvenue dans l'équipe ZONITE !\n\nBonne vente,\nL'équipe ZONITE`
    }).catch(() => {});

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Formation terminée',
      module: 'vendeur',
      details: `Formation terminée par ${seller.nom_complet} (${email})`,
      utilisateur: email,
      entite_id: seller.id
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Formation terminée avec succès !',
      seller_status: 'active_seller',
      catalogue_debloque: true
    });

  } catch (error) {
    console.error('❌ Training completion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});