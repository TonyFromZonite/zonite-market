import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * ADMIN-CREATED SELLER WORKFLOW (NEW ARCHITECTURE)
 * 1. Create Base44 user FIRST (with generated password)
 * 2. Create Seller linked to Base44 user (user_id never null)
 * 3. Send credentials email
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const {
      email,
      nom_complet,
      telephone,
      ville,
      quartier,
      numero_mobile_money,
      operateur_mobile_money,
      taux_commission,
      auto_valider_kyc = false
    } = await req.json();

    if (!email || !nom_complet) {
      return Response.json({ 
        error: 'Données manquantes (email et nom requis)' 
      }, { status: 400 });
    }

    console.log(`📝 Admin creating seller: ${email}, auto_validate: ${auto_valider_kyc}`);

    // Check duplicates
    const existingSellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (existingSellers.length > 0) {
      return Response.json({ error: 'Un vendeur existe déjà avec cet email' }, { status: 400 });
    }

    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'Un utilisateur existe déjà avec cet email' }, { status: 400 });
    }

    // Générer un mot de passe sécurisé automatiquement
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    const motDePasseGenere = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    // ÉTAPE 1 : Créer le compte User Base44 EN PREMIER
    let user_id = null;
    let newUser = null;
    try {
      newUser = await base44.users.createUser({ email, password: motDePasseGenere, role: 'user' });
      user_id = newUser?.id || null;
      if (!user_id) throw new Error('user_id null après createUser');
      console.log(`✅ Compte Base44 créé pour ${email}, user_id: ${user_id}`);
    } catch (userError) {
      console.error(`❌ Impossible de créer le compte Base44 pour ${email}:`, userError.message);
      return Response.json({ error: `Impossible de créer le compte: ${userError.message}` }, { status: 500 });
    }

    // ÉTAPE 2 : Déterminer le statut selon auto_valider_kyc
    const seller_status = auto_valider_kyc ? 'kyc_approved_training_required' : 'kyc_required';
    const statut_kyc = auto_valider_kyc ? 'valide' : 'en_attente';
    const statut = auto_valider_kyc ? 'actif' : 'en_attente_kyc';

    // ÉTAPE 3 : Créer le Seller lié au User — rollback si échec
    let seller;
    try {
      seller = await base44.asServiceRole.entities.Seller.create({
        user_id,   // Jamais null
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
        statut_kyc,
        statut,
        seller_status,
        created_by: user.email,
        taux_commission: taux_commission || 0,
        solde_commission: 0,
        total_commissions_gagnees: 0,
        total_commissions_payees: 0,
        nombre_ventes: 0,
        chiffre_affaires_genere: 0,
        ventes_reussies: 0,
        ventes_echouees: 0,
        email_verified: true,
        verification_code: null,
        verification_code_expiry: null,
        video_vue: auto_valider_kyc,
        training_completed: auto_valider_kyc,
        conditions_acceptees: auto_valider_kyc,
        catalogue_debloque: auto_valider_kyc,
        date_embauche: new Date().toISOString().split('T')[0]
      });
      console.log(`✅ Seller créé: ${seller.id}, user_id: ${user_id}`);
    } catch (sellerError) {
      // ROLLBACK : supprimer le User Base44 créé
      console.error(`❌ Seller creation failed, rolling back User ${user_id}:`, sellerError.message);
      try { await base44.asServiceRole.entities.User.delete(user_id); } catch (_) {}
      return Response.json({ error: `Erreur création profil vendeur: ${sellerError.message}` }, { status: 500 });
    }

    // ÉTAPE 4 : Notification interne
    const messageNotif = auto_valider_kyc
      ? '🎉 Votre compte vendeur a été créé et activé. Regardez la vidéo de formation pour débloquer le catalogue.'
      : '📋 Votre compte vendeur a été créé. Complétez votre KYC pour débloquer le catalogue.';

    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: auto_valider_kyc ? '🎉 Bienvenue chez ZONITE !' : '📋 Compte créé',
      message: messageNotif,
      type: auto_valider_kyc ? 'succes' : 'info',
      importante: true
    }).catch(() => {});

    // ÉTAPE 5 : Envoyer email avec identifiants (mot de passe généré)
    const appUrl = Deno.env.get('APP_URL') || 'https://app.zonite.cm';
    const messageEmail = auto_valider_kyc
      ? `Bonjour ${nom_complet},\n\nBienvenue chez ZONITE ! 🚀\n\nVotre compte vendeur est créé et votre KYC a été validé.\n\nEmail : ${email}\nMot de passe : ${motDePasseGenere}\n\nConnectez-vous sur : ${appUrl}\n\n⚠️ Changez votre mot de passe dès la première connexion.\n⚠️ PROCHAINE ÉTAPE : Regardez la vidéo de formation obligatoire pour débloquer le catalogue.\n\nBonne vente !\nL'équipe ZONITE`
      : `Bonjour ${nom_complet},\n\nVotre compte vendeur a été créé par nos administrateurs.\n\nEmail : ${email}\nMot de passe : ${motDePasseGenere}\n\nConnectez-vous sur : ${appUrl}\n\n⚠️ Changez votre mot de passe dès la première connexion.\n\n📋 ÉTAPE 1 : Soumettre votre dossier KYC\n📹 ÉTAPE 2 : Regarder la vidéo de formation\n🛍️ ÉTAPE 3 : Accès au catalogue\n\nCordialement,\nL'équipe ZONITE`;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: auto_valider_kyc ? '🎉 Bienvenue chez ZONITE — Vos identifiants' : '📋 Compte ZONITE créé — Vos identifiants',
      body: messageEmail
    }).catch(e => console.warn('Email failed:', e.message));

    // ÉTAPE 6 : Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: auto_valider_kyc ? 'Vendeur créé et activé' : 'Vendeur créé',
      module: 'vendeur',
      details: `${nom_complet} (${email}) créé par ${user.email}`,
      utilisateur: user.email,
      entite_id: seller.id,
      donnees_apres: JSON.stringify({ seller_id: seller.id, user_id, email, statut, statut_kyc, seller_status })
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Vendeur créé avec succès',
      seller_id: seller.id,
      user_id,
      email: seller.email,
      statut: seller.statut,
      statut_kyc: seller.statut_kyc,
      seller_status: seller.seller_status
    });

  } catch (error) {
    console.error('❌ Error creating seller:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});