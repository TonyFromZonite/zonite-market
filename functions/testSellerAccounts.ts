import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Test de l'intégrité des comptes vendeurs
 * Vérifie : migration Vendeur->Seller, commissions, KYC
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès réservé aux admins' }, { status: 403 });
    }

    const sellers = await base44.asServiceRole.entities.Seller.list();
    const commandes = await base44.asServiceRole.entities.CommandeVendeur.list();

    const rapport = sellers.map(s => {
      const commandesVendeur = commandes.filter(c => c.vendeur_id === s.id);
      const commandesLivrees = commandesVendeur.filter(c => c.statut === 'livree');
      const commissionsTheorique = commandesLivrees.reduce((t, c) => t + (c.commission_vendeur || 0), 0);

      return {
        nom: s.nom_complet,
        email: s.email,
        statut: s.statut,
        statut_kyc: s.statut_kyc,
        nb_commandes: commandesVendeur.length,
        nb_livrees: commandesLivrees.length,
        commissions_gagnees: s.total_commissions_gagnees || 0,
        commissions_payees: s.total_commissions_payees || 0,
        solde_commission: s.solde_commission || 0,
        commissions_theorique: commissionsTheorique,
        ecart: Math.abs((s.total_commissions_gagnees || 0) - commissionsTheorique),
        coherent: Math.abs((s.total_commissions_gagnees || 0) - commissionsTheorique) < 1
      };
    });

    const stats = {
      total_sellers: sellers.length,
      actifs: sellers.filter(s => s.statut === 'actif').length,
      kyc_valides: sellers.filter(s => s.statut_kyc === 'valide').length,
      kyc_attente: sellers.filter(s => s.statut_kyc === 'en_attente').length,
      problemes_commissions: rapport.filter(r => !r.coherent).length,
      total_commissions_a_payer: rapport.reduce((t, r) => t + r.solde_commission, 0)
    };

    return Response.json({ success: true, stats, sellers: rapport });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});