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
    const { nom_complet, telephone, ville, quartier, mot_de_passe, numero_mobile_money, operateur_mobile_money } = body;
    const email = body.email || body.user_email;

    if (!nom_complet || !email || !mot_de_passe) {
      return Response.json({ error: 'Données manquantes (nom, email, mot de passe requis)' }, { status: 400 });
    }

    // Vérifier si un vendeur existe déjà avec cet email
    const sellersExistants = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellersExistants.length > 0) {
      return Response.json({ error: 'Un compte vendeur existe déjà avec cet email' }, { status: 400 });
    }

    // Hacher le mot de passe (async pour éviter CPU timeout)
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Créer le vendeur directement validé dans Seller
    console.log('📝 Création du vendeur validé...');
    
    const dataSeller = {
      email,
      nom_complet,
      telephone: telephone || '',
      ville: ville || '',
      quartier: quartier || '',
      numero_mobile_money: numero_mobile_money || '',
      operateur_mobile_money: operateur_mobile_money || '',
      mot_de_passe_hash: hashedPassword,
      statut_kyc: 'valide',
      statut: 'actif',
      video_vue: true,
      conditions_acceptees: true,
      catalogue_debloque: true,
      date_embauche: new Date().toISOString().split('T')[0],
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      chiffre_affaires_genere: 0,
    };
    
    const sellerCree = await base44.asServiceRole.entities.Seller.create(dataSeller);
    console.log('✅ Vendeur créé, ID:', sellerCree.id);

    if (!sellerCree || !sellerCree.id) {
      throw new Error('Échec de la création du vendeur');
    }

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Vendeur créé par admin',
      module: 'vendeur',
      details: `Vendeur ${nom_complet} (${email}) créé directement par ${user.email}`,
      utilisateur: user.email,
      entite_id: sellerCree.id,
    }).catch(() => {});

    // Notification in-app
    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: email,
      titre: '🎉 Bienvenue chez ZONITE !',
      message: `Votre compte vendeur a été créé. Connectez-vous avec vos identifiants pour commencer.`,
      type: 'succes',
    }).catch(() => {});

    // Envoyer email avec identifiants (optionnel, ne bloque pas la création)
    base44.integrations.Core.SendEmail({
      to: email,
      subject: '🎉 Bienvenue chez ZONITE – Vos identifiants de connexion',
      body: `Bonjour ${nom_complet},\n\nBienvenue chez ZONITE ! 🚀\n\nVotre compte vendeur a été créé par notre équipe.\n\nVoici vos identifiants de connexion :\n\n📧 Email : ${email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ Pour votre sécurité, nous vous recommandons de changer ce mot de passe dès votre première connexion depuis votre profil.\n\nBon courage et bonne vente !\n\nL'équipe ZONITE`
    }).catch(e => {
      console.warn('Email notification failed (non-blocking):', e.message);
    });

    return Response.json({ 
      success: true, 
      message: 'Vendeur créé avec succès',
      seller_id: sellerCree.id
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});