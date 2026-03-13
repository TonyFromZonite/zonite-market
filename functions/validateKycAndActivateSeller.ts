import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { compteVendeurId, mot_de_passe } = body;

    if (!compteVendeurId || !mot_de_passe) {
      return Response.json({ error: 'ID du compte et mot de passe requis' }, { status: 400 });
    }

    const compteVendeur = await base44.asServiceRole.entities.CompteVendeur.get(compteVendeurId);
    if (!compteVendeur) {
      return Response.json({ error: 'CompteVendeur non trouvé' }, { status: 404 });
    }

    await base44.asServiceRole.entities.CompteVendeur.update(compteVendeurId, {
      statut_kyc: 'valide',
      statut: 'actif',
      video_vue: true,
      conditions_acceptees: true,
      catalogue_debloque: true,
    });

    const vendeur = await base44.asServiceRole.entities.Vendeur.create({
      nom_complet: compteVendeur.nom_complet,
      email: compteVendeur.user_email,
      telephone: compteVendeur.telephone || '',
      statut: 'actif',
      date_embauche: new Date().toISOString().split('T')[0],
      solde_commission: 0,
      total_commissions_gagnees: 0,
      total_commissions_payees: 0,
      nombre_ventes: 0,
      chiffre_affaires_genere: 0,
    });

    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'KYC Validé et Vendeur Activé',
      module: 'vendeur',
      details: `${compteVendeur.nom_complet} (${compteVendeur.user_email}) activé par ${user.email}`,
      utilisateur: user.email,
      entite_id: compteVendeurId,
    }).catch(() => {});

    await base44.asServiceRole.entities.NotificationVendeur.create({
      vendeur_email: compteVendeur.user_email,
      titre: '🎉 Bienvenue chez ZONITE !',
      message: `Votre compte a été validé et activé. Connectez-vous avec vos identifiants.`,
      type: 'succes',
    }).catch(() => {});

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: compteVendeur.user_email,
      subject: '🎉 Bienvenue chez ZONITE – Vos identifiants de connexion',
      body: `Bonjour ${compteVendeur.nom_complet},\n\nBienvenue chez ZONITE ! 🚀\n\nVotre compte vendeur a été créé et validé par notre équipe.\n\n📧 Email : ${compteVendeur.user_email}\n🔐 Mot de passe : ${mot_de_passe}\n\n⚠️ Pour votre sécurité, changez ce mot de passe dès votre première connexion.\n\nBon courage et bonne vente !\n\nL'équipe ZONITE`
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Vendeur validé et activé avec succès',
      compte_id: compteVendeurId,
      vendeur_id: vendeur.id
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});