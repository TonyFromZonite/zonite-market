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
    const { nom_complet, email, telephone, ville, quartier, mot_de_passe, numero_mobile_money, operateur_mobile_money } = body;

    if (!nom_complet || !email || !mot_de_passe || !numero_mobile_money) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const comptesExistants = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
    if (comptesExistants.length > 0) {
      return Response.json({ error: 'Un compte vendeur existe déjà avec cet email' }, { status: 400 });
    }

    try {
      await base44.users.inviteUser(email, 'user');
    } catch (inviteError) {
      if (!inviteError.message.includes('already exists')) {
        console.error('Invite error:', inviteError.message);
      }
    }

    const hashedPassword = bcrypt.hashSync(mot_de_passe, 10);

    const compteVendeur = await base44.asServiceRole.entities.CompteVendeur.create({
      user_email: email,
      nom_complet,
      telephone: telephone || '',
      ville: ville || '',
      quartier: quartier || '',
      numero_mobile_money: numero_mobile_money || '',
      operateur_mobile_money: operateur_mobile_money || 'orange_money',
      statut_kyc: 'en_attente',
      statut: 'en_attente_kyc',
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

    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Compte Vendeur créé par admin',
      module: 'vendeur',
      details: `Compte initial pour ${nom_complet} (${email}) créé par ${user.email}`,
      utilisateur: user.email,
      entite_id: compteVendeur.id,
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Compte vendeur créé - KYC en attente de validation',
      compte_id: compteVendeur.id,
      nom_complet,
      email,
      mot_de_passe: mot_de_passe,
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});