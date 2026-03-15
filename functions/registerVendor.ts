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

    // Vérifier si un vendeur existe déjà avec cet email
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

    // Générer un code de vérification (6 chiffres)
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const codeExpiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

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
      seller_status: 'pending_verification', // NEW: Proper status engine
      video_vue: false,
      training_completed: false,
      conditions_acceptees: false,
      catalogue_debloque: false,
      date_embauche: new Date().toISOString().split('T')[0],
      email_verified: false,
      verification_code: verificationCode,
      verification_code_expiry: codeExpiryTime,
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      chiffre_affaires_genere: 0,
      ventes_reussies: 0,
      ventes_echouees: 0,
    };

    const sellerCree = await base44.asServiceRole.entities.Seller.create(dataSeller);

    if (!sellerCree || !sellerCree.id) {
      throw new Error('Échec de la création du vendeur');
    }

    // Envoyer le code de vérification par email
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🔐 Votre code de vérification ZONITE',
        body: `Bonjour ${nom_complet},\n\nMerci de votre inscription chez ZONITE ! 🚀\n\nVotre code de vérification est : ${verificationCode}\n\nCe code expire dans 15 minutes.\n\nEntrez ce code pour vérifier votre email et accéder à votre compte.\n\nSi vous n'avez pas demandé cette inscription, ignorez ce message.\n\nL'équipe ZONITE`
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

    return Response.json({ 
      success: true, 
      seller_id: sellerCree.id, 
      email, 
      status: 'en_attente_verification',
      message: 'Code de vérification envoyé par email'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});