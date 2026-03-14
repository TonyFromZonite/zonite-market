import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      email,
      nom_complet,
      telephone,
      ville,
      quartier,
      mot_de_passe,
      numero_mobile_money,
      operateur_mobile_money,
      photo_identite_url,
      photo_identite_verso_url,
      selfie_url,
    } = body;

    // Validation des champs requis
    if (!email || !nom_complet || !mot_de_passe || !numero_mobile_money) {
      return Response.json({ error: 'Données manquantes (email, nom, mot de passe, mobile money requis)' }, { status: 400 });
    }

    // Vérifier si un vendeur existe déjà avec cet email (avec lock)
    const sellersExistants = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellersExistants.length > 0) {
      return Response.json({ error: 'Un compte vendeur existe déjà avec cet email' }, { status: 409 });
    }
    
    // Vérifier aussi dans User entity (Base44) pour éviter les doublons
    try {
      const usersExistants = await base44.asServiceRole.entities.User.filter({ email });
      if (usersExistants.length > 0) {
        return Response.json({ error: 'Cet email est déjà utilisé dans le système' }, { status: 409 });
      }
    } catch (_) {
      // Si User.filter échoue, continuer
    }

    // Hacher le mot de passe
    const hashedPassword = bcrypt.hashSync(mot_de_passe, 10);

    // Créer le vendeur dans Seller
    const dataSeller = {
      email,
      nom_complet,
      telephone: telephone || '',
      ville: ville || '',
      quartier: quartier || '',
      numero_mobile_money: numero_mobile_money || '',
      operateur_mobile_money: operateur_mobile_money || '',
      photo_identite_url: photo_identite_url || '',
      photo_identite_verso_url: photo_identite_verso_url || '',
      selfie_url: selfie_url || '',
      mot_de_passe_hash: hashedPassword,
      statut_kyc: 'en_attente',
      statut: 'en_attente_kyc',
      video_vue: false,
      conditions_acceptees: true,
      catalogue_debloque: false,
      date_embauche: new Date().toISOString().split('T')[0],
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      chiffre_affaires_genere: 0,
    };

    const sellerCree = await base44.asServiceRole.entities.Seller.create(dataSeller);

    if (!sellerCree || !sellerCree.id) {
      throw new Error('Échec de la création du vendeur');
    }

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Vendeur auto-inscrit',
      module: 'vendeur',
      details: `Vendeur ${nom_complet} (${email}) auto-inscrit`,
      utilisateur: email,
      entite_id: sellerCree.id,
    }).catch(() => {});

    // Notification in-app
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: '🎉 Bienvenue chez ZONITE !',
      message: 'Votre inscription est en attente de validation KYC. Nous vous contacterons dès que possible.',
      type: 'info',
    }).catch(() => {});

    // Envoyer email de confirmation
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🎉 Bienvenue chez ZONITE – Inscription en attente de validation',
        body: `Bonjour ${nom_complet},\n\nMerci de vous être inscrit chez ZONITE ! 🚀\n\nVotre dossier KYC est maintenant en cours de vérification. Notre équipe examinera vos documents et vous contactera sous peu.\n\nBon courage !\n\nL'équipe ZONITE`
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

    return Response.json({ 
      success: true, 
      message: 'Inscription réussie. Votre dossier KYC est en attente de validation.',
      seller_id: sellerCree.id
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});