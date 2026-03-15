import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * SELF-REGISTRATION WORKFLOW (NEW ARCHITECTURE)
 * 1. Create Base44 user FIRST
 * 2. Send email verification code
 * 3. Create Seller linked to Base44 user
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
    if (!email || !nom_complet || !mot_de_passe || !numero_mobile_money) {
      return Response.json({ 
        error: 'Données manquantes (email, nom, mot de passe, mobile money requis)' 
      }, { status: 400 });
    }

    console.log(`📝 Self-registration: ${email}`);

    // Check duplicates in Seller
    const existingSellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (existingSellers.length > 0) {
      return Response.json({ 
        error: 'Un compte vendeur existe déjà avec cet email' 
      }, { status: 409 });
    }

    // Check duplicates in Base44 Users
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ 
        error: 'Cet email est déjà utilisé dans le système' 
      }, { status: 409 });
    }

    // STEP 1: Check if Base44 user exists
    // Note: Base44 auto-creates users on first login
    let user_id = null;
    
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      user_id = existingUsers[0].id;
      console.log(`ℹ️ Base44 user already exists: ${email}`);
    } else {
      // User will be auto-created on first login
      console.log(`ℹ️ Base44 user will be auto-created on first login: ${email}`);
    }

    // STEP 2: Generate verification code
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const codeExpiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // STEP 2: Create Seller (user_id will be linked on first login)
    const sellerData = {
      user_id: user_id, // Will be null if user doesn't exist yet
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
      seller_status: 'pending_verification', // Must verify email first
      email_verified: false,
      verification_code: verificationCode,
      verification_code_expiry: codeExpiryTime,
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
      created_by: null, // Self-registered
    };

    const seller = await base44.asServiceRole.entities.Seller.create(sellerData);
    console.log(`✅ Seller created: ${seller.id}, user_id: ${user_id || 'will be linked on first login'}`);

    // STEP 4: Send verification email
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🔐 Votre code de vérification ZONITE',
        body: `Bonjour ${nom_complet},\n\nMerci de votre inscription chez ZONITE ! 🚀\n\nVotre code de vérification est : ${verificationCode}\n\nCe code expire dans 15 minutes.\n\nEntrez ce code pour vérifier votre email et accéder à votre compte.\n\nSi vous n'avez pas demandé cette inscription, ignorez ce message.\n\nL'équipe ZONITE`
      });
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailErr) {
      console.warn('⚠️ Email send failed:', emailErr.message);
    }

    // STEP 5: Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Inscription vendeur',
      module: 'vendeur',
      details: `${nom_complet} (${email}) s'est inscrit`,
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
      message: 'Code de vérification envoyé par email'
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});