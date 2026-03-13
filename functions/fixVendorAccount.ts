import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

/**
 * Corrige un vendeur existant en créant son CompteVendeur manquant et l'invitant dans Base44
 * Utilisé pour les vendeurs créés directement dans Vendeur sans passer par createValidatedSeller
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { vendeur_id, email, mot_de_passe } = body;

    if (!vendeur_id || !email || !mot_de_passe) {
      return Response.json({ error: 'vendeur_id, email et mot_de_passe requis' }, { status: 400 });
    }

    // Récupérer le vendeur existant
    const vendeurs = await base44.asServiceRole.entities.Vendeur.filter({ id: vendeur_id });
    if (vendeurs.length === 0) {
      return Response.json({ error: 'Vendeur introuvable' }, { status: 404 });
    }
    const vendeur = vendeurs[0];

    // Vérifier si un CompteVendeur existe déjà
    const comptesExistants = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
    if (comptesExistants.length > 0) {
      return Response.json({ error: 'Un CompteVendeur existe déjà pour cet email' }, { status: 400 });
    }

    // Inviter l'utilisateur dans l'app
    console.log('👤 Invitation de l\'utilisateur:', email);
    try {
      await base44.users.inviteUser(email, 'user');
    } catch (inviteError) {
      if (!inviteError.message.includes('already exists')) {
        console.error('Invite error:', inviteError.message);
      }
    }

    // Hacher le mot de passe
    const hashedPassword = bcrypt.hashSync(mot_de_passe, 10);

    // Créer le CompteVendeur avec KYC validé
    console.log('📝 Création du CompteVendeur pour:', email);
    const compteVendeur = await base44.asServiceRole.entities.CompteVendeur.create({
      user_email: email,
      nom_complet: vendeur.nom_complet,
      telephone: vendeur.telephone || '',
      ville: '',
      quartier: '',
      numero_mobile_money: '',
      operateur_mobile_money: 'orange_money',
      statut_kyc: 'valide',  // Pré-validé par l'admin
      statut: 'actif',
      mot_de_passe_hash: hashedPassword,
      video_vue: true,
      conditions_acceptees: true,
      catalogue_debloque: true,
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      ventes_reussies: 0,
      ventes_echouees: 0,
    });

    console.log('✅ CompteVendeur créé, ID:', compteVendeur?.id);
    
    if (!compteVendeur || !compteVendeur.id) {
      throw new Error('Échec de la création du CompteVendeur');
    }

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'CompteVendeur créé pour vendeur existant',
      module: 'vendeur',
      details: `CompteVendeur créé pour vendeur ${vendeur.nom_complet} (${email}) par ${user.email}`,
      utilisateur: user.email,
      entite_id: vendeur.id,
    }).catch(() => {});

    // Notification in-app
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: '🎉 Votre compte est maintenant actif !',
      message: `Bienvenue chez ZONITE ! Votre compte a été validé. Vous pouvez maintenant accéder au catalogue et commencer à vendre.`,
      type: 'succes',
    }).catch(() => {});

    // Envoyer email
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: '🎉 Bienvenue chez ZONITE – Votre compte est actif !',
        body: `Bonjour ${vendeur.nom_complet},\n\nBienvenue chez ZONITE ! 🚀\n\nVotre compte vendeur a été créé et validé par notre équipe.\n\nVoici vos identifiants de connexion :\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ Pour votre sécurité, nous vous recommandons de changer ce mot de passe dès votre première connexion depuis votre profil.\n\nBon courage et bonne vente !\n\nL'équipe ZONITE`
      });
      console.log('✅ Email envoyé');
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

    return Response.json({ 
      success: true, 
      message: 'Compte vendeur corrigé et activé',
      compte_id: compteVendeur.id,
      vendeur_id: vendeur.id
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});