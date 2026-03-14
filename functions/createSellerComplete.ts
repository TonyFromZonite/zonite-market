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

    console.log(`📝 Création vendeur: ${email}`);

    // Hasher mot de passe
    const passwordHash = await bcrypt.hash(mot_de_passe, 10);

    // Statut KYC
    const statutKyc = auto_valider_kyc ? 'valide' : 'en_attente';
    const statut = auto_valider_kyc ? 'actif' : 'en_attente_kyc';

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
      statut_kyc: statutKyc,
      statut,
      taux_commission: taux_commission || 0,
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      chiffre_affaires_genere: 0,
      ventes_reussies: 0,
      ventes_echouees: 0,
      video_vue: auto_valider_kyc,
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
      ? `Bonjour ${nom_complet},\n\nBienvenue chez ZONITE ! 🚀\n\nVotre compte vendeur est activé.\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ Changez votre mot de passe dès la première connexion.\n\nBonne vente !\nL'équipe ZONITE`
      : `Bonjour ${nom_complet},\n\nVotre compte vendeur a été créé.\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ Complétez votre dossier KYC pour accéder au catalogue.\n\nCordialement,\nL'équipe ZONITE`;

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