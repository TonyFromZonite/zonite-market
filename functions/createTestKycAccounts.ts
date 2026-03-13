import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Créer 2 comptes test avec tous les documents KYC
    const accounts = [
      {
        email: 'kyc.test1@example.com',
        password: 'Test1234!',
        nom_complet: 'Vendeur Test KYC 1',
        telephone: '+237612345678',
        ville: 'Douala',
        quartier: 'Bonamoussadi',
      },
      {
        email: 'kyc.test2@example.com',
        password: 'Test1234!',
        nom_complet: 'Vendeur Test KYC 2',
        telephone: '+237698765432',
        ville: 'Yaoundé',
        quartier: 'Mfoundi',
      },
    ];

    const created = [];
    for (const account of accounts) {
      const hash = await bcrypt.hash(account.password, 10);
      const seller = await base44.asServiceRole.entities.Seller.create({
        email: account.email,
        mot_de_passe_hash: hash,
        nom_complet: account.nom_complet,
        telephone: account.telephone,
        ville: account.ville,
        quartier: account.quartier,
        numero_mobile_money: account.telephone,
        operateur_mobile_money: 'orange_money',
        photo_identite_url: 'https://via.placeholder.com/300x200?text=Identite',
        photo_identite_verso_url: 'https://via.placeholder.com/300x200?text=Verso',
        selfie_url: 'https://via.placeholder.com/300x200?text=Selfie',
        statut_kyc: 'en_attente',
        statut: 'en_attente_kyc',
        video_vue: true,
        conditions_acceptees: true,
      });
      created.push({ id: seller.id, email: account.email });
    }

    return Response.json({ success: true, accounts: created });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});