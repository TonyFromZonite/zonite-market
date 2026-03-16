import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

/**
 * SELF-REGISTRATION WORKFLOW
 * 1. Create Base44 user FIRST
 * 2. Create Seller with status pending_verification
 * 3. Send email verification code
 * 4. Seller must verify email → submit KYC → wait approval → watch training → activate
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      email,
      nom_complet,
      telephone,
      ville,
      quartier,
      mot_de_passe,
      numero_mobile_money,
      operateur_mobile_money,
    } = await req.json();

    // Validation
    if (!email || !nom_complet || !mot_de_passe) {
      return Response.json({ 
        error: 'Données manquantes (email, nom et mot de passe requis)' 
      }, { status: 400 });
    }

    console.log(`📝 Self-registration: ${email}`);

    // Vérifier doublon Seller
    const existingSellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (existingSellers.length > 0) {
      return Response.json({ 
        error: 'Un compte vendeur existe déjà avec cet email' 
      }, { status: 409 });
    }

    // Vérifier doublon User Base44
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ 
        error: 'Cet email est déjà utilisé dans le système' 
      }, { status: 409 });
    }

    // Générer code de vérification
    const newCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // ÉTAPE 1 : Créer le compte User Base44 EN PREMIER
    let user_id = null;
    try {
      const registerResult = await base44.auth.register({ email, password: mot_de_passe });
      user_id = registerResult?.user?.id || registerResult?.id || null;
      if (!user_id) {
        const usersCheck = await base44.asServiceRole.entities.User.filter({ email });
        user_id = usersCheck[0]?.id || null;
      }
      if (!user_id) throw new Error('user_id introuvable après register');
      console.log(`✅ Compte Base44 créé pour ${email}, user_id: ${user_id}`);
    } catch (userError) {
      console.error(`❌ Impossible de créer le compte Base44 pour ${email}:`, userError.message);
      return Response.json({ error: `Impossible de créer le compte: ${userError.message}` }, { status: 500 });
    }

    // ÉTAPE 2 : Créer le Seller avec statut pending_verification
    const sellerData = {
      user_id: user_id,
      email,
      nom_complet,
      telephone: telephone || '',
      ville: ville || '',
      quartier: quartier || '',
      numero_mobile_money: numero_mobile_money || '',
      operateur_mobile_money: operateur_mobile_money || '',
      photo_identite_url: '',
      photo_identite_verso_url: '',
      selfie_url: '',
      statut_kyc: 'en_attente',
      statut: 'en_attente_kyc',
      seller_status: 'pending_verification',
      email_verified: false,
      verification_code: newCode,
      verification_code_expiry: expiryTime,
      video_vue: false,
      training_completed: false,
      conditions_acceptees: false,
      catalogue_debloque: false,
      date_embauche: new Date().toISOString().split('T')[0],
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      chiffre_affaires_genere: 0,
      ventes_reussies: 0,
      ventes_echouees: 0,
      created_by: null
    };

    let seller;
    try {
      seller = await base44.asServiceRole.entities.Seller.create(sellerData);
      console.log(`✅ Seller created: ${seller.id}, user_id: ${user_id}`);
    } catch (sellerError) {
      // ROLLBACK : supprimer le compte Base44 créé
      console.error(`❌ Seller creation failed, rolling back User ${user_id}:`, sellerError.message);
      try { await base44.asServiceRole.entities.User.delete(user_id); } catch (_) {
        console.warn(`⚠️ Rollback partiel: User ${user_id} non supprimé`);
      }
      return Response.json({ error: `Erreur création profil vendeur: ${sellerError.message}` }, { status: 500 });
    }

    // ÉTAPE 3 : Envoyer le code de vérification par email
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🔐 Votre code de vérification ZONITE',
        body: `Bonjour ${nom_complet},\n\nVotre code de vérification est : ${newCode}\n\nCe code expire dans 15 minutes.\n\nSi vous n'avez pas demandé ce code, ignorez ce message.\n\nL'équipe ZONITE`
      });
      console.log(`📧 Code de vérification envoyé à ${email}`);
    } catch (emailError) {
      console.error('Email send failed:', emailError.message);
      // On continue même si l'email échoue — le vendeur peut redemander le code
    }

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Inscription vendeur',
      module: 'vendeur',
      details: `${nom_complet} (${email}) s'est inscrit — en attente de vérification email`,
      utilisateur: email,
      entite_id: seller.id,
      donnees_apres: JSON.stringify({
        seller_id: seller.id,
        user_id: user_id,
        email,
        seller_status: 'pending_verification'
      })
    }).catch(() => {});

    return Response.json({ 
      success: true, 
      seller_id: seller.id,
      user_id: user_id,
      email, 
      status: 'pending_verification',
      message: 'Compte créé avec succès. Vérifiez votre email pour le code de vérification.'
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});