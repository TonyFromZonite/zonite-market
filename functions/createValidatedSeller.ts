import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { nom_complet, telephone, ville, quartier, mot_de_passe } = body;
    const email = body.email || body.user_email;

    if (!nom_complet || !email || !mot_de_passe) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Vérifier si un compte vendeur existe déjà avec cet email
    const comptesExistants = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
    if (comptesExistants.length > 0) {
      return Response.json({ error: 'Un compte vendeur existe déjà avec cet email' }, { status: 400 });
    }

    // Inviter l'utilisateur dans l'app (requis pour l'envoi d'email)
    try {
      await base44.asServiceRole.users.inviteUser(email, 'vendeur');
    } catch (inviteError) {
      // Ignorer si l'utilisateur existe déjà
      if (!inviteError.message.includes('already exists')) {
        console.error('Invite error:', inviteError.message);
      }
    }

    // Hacher le mot de passe
    const hashedPassword = bcrypt.hashSync(mot_de_passe, 10);

    // Créer le CompteVendeur avec statut validé
    const compteVendeur = await base44.asServiceRole.entities.CompteVendeur.create({
      user_email: email,
      nom_complet,
      telephone: telephone || '',
      ville: ville || '',
      quartier: quartier || '',
      statut_kyc: 'valide',
      statut: 'actif',
      mot_de_passe_hash: hashedPassword,
      video_vue: false,
      conditions_acceptees: false,
      catalogue_debloque: false,
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      ventes_reussies: 0,
      ventes_echouees: 0,
    });

    // Créer l'entité Vendeur
    try {
      const vendeurs = await base44.asServiceRole.entities.Vendeur.filter({ email });
      if (vendeurs.length === 0) {
        await base44.asServiceRole.entities.Vendeur.create({
          nom_complet,
          email,
          telephone: telephone || '',
          statut: 'actif',
          date_embauche: new Date().toISOString().split('T')[0],
          solde_commission: 0,
          total_commissions_gagnees: 0,
          total_commissions_payees: 0,
          nombre_ventes: 0,
          chiffre_affaires_genere: 0,
        });
      }
    } catch (vendeurError) {
      console.error('Erreur création Vendeur (ignorée, CompteVendeur créé):', vendeurError.message);
    }

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Vendeur créé par admin',
      module: 'vendeur',
      details: `Vendeur ${nom_complet} (${email}) créé directement par ${user.email}`,
      utilisateur: user.email,
      entite_id: compteVendeur.id,
    }).catch(() => {});

    // Notification in-app
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: '🎉 Bienvenue chez ZONITE !',
      message: `Votre compte vendeur a été créé. Connectez-vous avec vos identifiants pour commencer.`,
      type: 'succes',
    }).catch(() => {});

    // Envoyer email avec identifiants
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: '🎉 Bienvenue chez ZONITE – Vos identifiants de connexion',
        body: `Bonjour ${nom_complet},\n\nBienvenue chez ZONITE ! 🚀\n\nVotre compte vendeur a été créé par notre équipe.\n\nVoici vos identifiants de connexion :\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ Pour votre sécurité, nous vous recommandons de changer ce mot de passe dès votre première connexion depuis votre profil.\n\nBon courage et bonne vente !\n\nL'équipe ZONITE`
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

    return Response.json({ 
      success: true, 
      message: 'Vendeur créé avec succès',
      compte_id: compteVendeur.id 
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});