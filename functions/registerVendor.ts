import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const {
      email, nom_complet, telephone, mot_de_passe,
      ville, quartier, numero_mobile_money, operateur_mobile_money,
      photo_identite_url, photo_identite_verso_url, selfie_url
    } = await req.json();

    // Validation des champs obligatoires
    if (!email || !nom_complet || !telephone || !mot_de_passe) {
      return Response.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Format email invalide.' }, { status: 400 });
    }

    if (mot_de_passe.length < 6) {
      return Response.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 });
    }

    // Vérifier si un compte existe déjà
    const existants = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
    if (existants.length > 0) {
      return Response.json({ error: 'Un compte existe déjà avec cet email. Connectez-vous.' }, { status: 409 });
    }

    // ✅ Hachage du mot de passe côté serveur uniquement
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // ✅ Création via asServiceRole (contourne la RLS create)
    await base44.asServiceRole.entities.CompteVendeur.create({
      user_email: email,
      nom_complet,
      telephone,
      ville: ville || '',
      quartier: quartier || '',
      numero_mobile_money: numero_mobile_money || '',
      operateur_mobile_money: operateur_mobile_money || 'orange_money',
      photo_identite_url: photo_identite_url || '',
      photo_identite_verso_url: photo_identite_verso_url || '',
      selfie_url: selfie_url || '',
      mot_de_passe_hash: hashedPassword,
      statut_kyc: 'en_attente',
      statut: 'en_attente_kyc',
      video_vue: false,
      catalogue_debloque: false,
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      ventes_reussies: 0,
      ventes_echouees: 0,
    });

    // Créer le User Base44 avec rôle 'vendeur'
    try {
      await base44.functions.invoke('createUserOnInscription', {
        email,
        full_name: nom_complet
      });
    } catch (e) {
      // Silencieusement ignoré
    }

    // Email de confirmation
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: "📩 Votre demande d'inscription ZONITE a bien été reçue",
        body: `Bonjour ${nom_complet},\n\nMerci pour votre inscription sur ZONITE !\n\nVotre dossier KYC est en cours de vérification par notre équipe. Vous recevrez un email sous 24-48h avec votre décision et vos identifiants de connexion définitifs si votre dossier est validé.\n\nCordialement,\nL'équipe ZONITE`,
      });
    } catch (e) {
      // Silencieusement ignoré
    }

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'vendor_registration',
      module: 'systeme',
      details: `Nouvelle inscription vendeur: ${nom_complet} (${email})`,
      utilisateur: email,
    }).catch(() => {});

    return Response.json({ success: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});