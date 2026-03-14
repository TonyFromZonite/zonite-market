import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Test du flux de commandes vendeurs
 * Vérifie : création, validation, livraison, gestion stock
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès réservé aux admins' }, { status: 403 });
    }

    const commandes = await base44.asServiceRole.entities.CommandeVendeur.list('-created_date', 100);
    const produits = await base44.asServiceRole.entities.Produit.list();

    const parStatut = {
      en_attente_validation_admin: commandes.filter(c => c.statut === 'en_attente_validation_admin'),
      validee_admin: commandes.filter(c => c.statut === 'validee_admin'),
      attribuee_livreur: commandes.filter(c => c.statut === 'attribuee_livreur'),
      en_livraison: commandes.filter(c => c.statut === 'en_livraison'),
      livree: commandes.filter(c => c.statut === 'livree'),
      echec_livraison: commandes.filter(c => c.statut === 'echec_livraison'),
      annulee: commandes.filter(c => c.statut === 'annulee')
    };

    const stats = {
      total_commandes: commandes.length,
      en_attente: parStatut.en_attente_validation_admin.length,
      validees: parStatut.validee_admin.length,
      en_livraison: parStatut.en_livraison.length,
      livrees: parStatut.livree.length,
      echecs: parStatut.echec_livraison.length,
      annulees: parStatut.annulee.length,
      taux_reussite: commandes.length > 0 
        ? ((parStatut.livree.length / commandes.length) * 100).toFixed(2) + '%'
        : '0%'
    };

    // Vérifier cohérence stock réservé
    const stockProblems = [];
    for (const p of produits) {
      const commandesEnCours = commandes.filter(c => 
        c.produit_id === p.id && 
        ['en_attente_validation_admin', 'validee_admin', 'attribuee_livreur', 'en_livraison'].includes(c.statut)
      );
      const stockReserveTheorique = commandesEnCours.reduce((t, c) => t + (c.quantite || 0), 0);
      const stockReserveReel = p.stock_reserve || 0;
      
      if (Math.abs(stockReserveTheorique - stockReserveReel) > 0) {
        stockProblems.push({
          produit: p.nom,
          stock_reserve_reel: stockReserveReel,
          stock_reserve_theorique: stockReserveTheorique,
          ecart: stockReserveReel - stockReserveTheorique
        });
      }
    }

    return Response.json({ 
      success: true, 
      stats, 
      parStatut: Object.keys(parStatut).reduce((acc, key) => {
        acc[key] = parStatut[key].length;
        return acc;
      }, {}),
      problemes_stock: stockProblems.length > 0 ? stockProblems : 'Aucun problème détecté'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});