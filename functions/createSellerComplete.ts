import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

/**
 * CRÉATION COMPLÈTE D'UN VENDEUR
 * Workflow automatisé: Seller → Notification → Email → Audit
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
      mot_de_passe,
      ville,
      quartier,
      numero_mobile_money,
      operateur_mobile_money,
      taux_commission,
      auto_valider_kyc = false
    } = await req.json();

    // Validation
    if (!email || !nom_complet || !mot_de_passe) {
      return Response.json({ 
        error: 'Données manquantes (email, nom, mot de passe requis)' 
      }, { status: 400 });
    }

    // Vérifier duplicata
    const existing = await base44.asServiceRole.entities.Seller.filter({ email });
    if (existing.length > 0) {
      return Response.json({ 
        error: 'Un vendeur existe déjà avec cet email' 
      }, { status: 400 });
    }

    console.log(`📝 Création vendeur par admin: ${email}`);

    // Hasher mot de passe
    const passwordHash = await bcrypt.hash(mot_de_passe, 10);

    // Status transitions based on auto_valider_kyc
    // If auto-validate: pending_verification → kyc_required → kyc_pending → kyc_approved_training_required (with training auto-marked)
    // If not: pending_verification → kyc_required → kyc_pending
    const seller_status = auto_valider_kyc ? 'kyc_approved_training_required' : 'kyc_required';
    const statut_kyc = auto_valider_kyc ? 'valide' : 'en_attente';
    const statut = auto_valider_kyc ? 'actif' : 'en_attente_kyc';

    // Create Base44 user FIRST
    try {
      await base44.users.inviteUser(email, 'user');
      console.log(`✅ Base44 user créé: ${email}`);
    } catch (inviteErr) {
      if (!inviteErr.message.includes('already exists')) {
        throw inviteErr;
      }
      console.log(`ℹ️ Base44 user existe déjà: ${email}`);
    }

    // Créer le Seller
    const seller = await base44.asServiceRole.entities.Seller.create({
      email,
      nom_complet,
      telephone: telephone || '',
      ville: ville || '',
      quartier: quartier || '',
      numero_mobile_money: numero_mobile_money || '',
      operateur_mobile_money: operateur_mobile_money || '',
      mot_de_passe_hash: passwordHash,
      statut_kyc: statut_kyc,
      statut,
      seller_status: seller_status, // NEW: Use proper status engine
      created_by: user.email, // Track who created this seller
      taux_commission: taux_commission || 0,
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      chiffre_affaires_genere: 0,
      ventes_reussies: 0,
      ventes_echouees: 0,
      email_verified: true, // Admin-created sellers have verified emails
      verification_code: null,
      verification_code_expiry: null,
      video_vue: auto_valider_kyc,
      training_completed: auto_valider_kyc,
      conditions_acceptees: auto_valider_kyc,
      catalogue_debloque: auto_valider_kyc,
      date_embauche: new Date().toISOString().split('T')[0]
    });

    console.log(`✅ Seller créé: ${seller.id}`);

    // Notification in-app
    const messageNotif = auto_valider_kyc
      ? '🎉 Votre compte vendeur a été créé et activé. Vous pouvez commencer à vendre !'
      : '📋 Votre compte vendeur a été créé. Complétez votre KYC pour débloquer le catalogue.';

    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: auto_valider_kyc ? '🎉 Bienvenue chez ZONITE !' : '📋 Compte créé',
      message: messageNotif,
      type: auto_valider_kyc ? 'succes' : 'info',
      importante: true
    }).catch(() => {});

    // Email avec identifiants
    const messageEmail = auto_valider_kyc
      ? `Bonjour ${nom_complet},\n\nBienvenue chez ZONITE ! 🚀\n\nVotre compte vendeur est créé et votre KYC a été validé.\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ PROCHAINE ÉTAPE : Regardez la vidéo de formation obligatoire pour débloquer le catalogue.\n\n⚠️ Changez votre mot de passe dès la première connexion.\n\nBonne vente !\nL'équipe ZONITE`
      : `Bonjour ${nom_complet},\n\nVotre compte vendeur a été créé par nos administrateurs.\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n📋 ÉTAPE 1 : Soumettre votre dossier KYC pour validation\n📹 ÉTAPE 2 : Regarder la vidéo de formation\n🛍️ ÉTAPE 3 : Accès au catalogue\n\n⚠️ Changez votre mot de passe dès la première connexion.\n\nCordialement,\nL'équipe ZONITE`;

    base44.integrations.Core.SendEmail({
      to: email,
      subject: auto_valider_kyc ? '🎉 Bienvenue chez ZONITE' : '📋 Compte ZONITE créé',
      body: messageEmail
    }).catch(e => console.warn('Email failed:', e.message));

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: auto_valider_kyc ? 'Vendeur créé et activé' : 'Vendeur créé',
      module: 'vendeur',
      details: `${nom_complet} (${email}) créé par ${user.email}`,
      utilisateur: user.email,
      entite_id: seller.id,
      donnees_apres: JSON.stringify({
        seller_id: seller.id,
        email,
        statut,
        statut_kyc: statutKyc
      })
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Vendeur créé avec succès',
      seller_id: seller.id,
      email: seller.email,
      statut: seller.statut,
      statut_kyc: seller.statut_kyc
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});