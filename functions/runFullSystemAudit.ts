import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AUDIT COMPLET DU SYSTÈME ZONITE
 * Vérifie toutes les entités et détecte les incohérences
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès réservé aux admins' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. AUDIT PRODUITS
    // ═══════════════════════════════════════════════════════════════════════
    const produits = await db.Produit.list();
    const produitsActifs = produits.filter(p => p.statut === 'actif');
    const produitsRupture = produits.filter(p => p.statut === 'rupture');
    
    const stockProblems = [];
    for (const p of produits) {
      const stockGlobal = p.stock_global || 0;
      const stockReserve = p.stock_reserve || 0;
      const stockDispo = stockGlobal - stockReserve;

      if (stockReserve < 0) {
        stockProblems.push({
          produit: p.nom,
          erreur: 'stock_reserve négatif',
          stock_reserve: stockReserve
        });
      }

      if (stockDispo < 0) {
        stockProblems.push({
          produit: p.nom,
          erreur: 'stock_reserve > stock_global',
          stock_global: stockGlobal,
          stock_reserve: stockReserve
        });
      }

      // Vérifier cohérence avec stocks_par_localisation
      if (p.stocks_par_localisation?.length > 0) {
        const stockLocs = p.stocks_par_localisation.reduce((total, loc) => {
          const stockZone = (loc.variations_stock || []).reduce((s, v) => s + (v.quantite || 0), 0);
          return total + stockZone;
        }, 0);

        if (Math.abs(stockLocs - stockGlobal) > 1) {
          stockProblems.push({
            produit: p.nom,
            erreur: 'Incohérence stock_global vs stocks_par_localisation',
            stock_global: stockGlobal,
            stock_localisations: stockLocs,
            ecart: Math.abs(stockLocs - stockGlobal)
          });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. AUDIT SELLERS (VENDEURS)
    // ═══════════════════════════════════════════════════════════════════════
    const sellers = await db.Seller.list();
    const commandesVendeurs = await db.CommandeVendeur.list();
    
    const sellerProblems = [];
    for (const s of sellers) {
      // Vérifier cohérence commissions
      const cmdsLivrees = commandesVendeurs.filter(c => 
        c.vendeur_id === s.id && c.statut === 'livree'
      );
      const commissionsTheorique = cmdsLivrees.reduce((t, c) => t + (c.commission_vendeur || 0), 0);
      const ecart = Math.abs((s.total_commissions_gagnees || 0) - commissionsTheorique);

      if (ecart > 1) {
        sellerProblems.push({
          vendeur: s.nom_complet,
          erreur: 'Incohérence commissions gagnées',
          total_gagnees: s.total_commissions_gagnees || 0,
          commissions_theorique: commissionsTheorique,
          ecart
        });
      }

      // Vérifier cohérence solde
      const soldeTheorique = (s.total_commissions_gagnees || 0) - (s.total_commissions_payees || 0);
      if (Math.abs((s.solde_commission || 0) - soldeTheorique) > 1) {
        sellerProblems.push({
          vendeur: s.nom_complet,
          erreur: 'Incohérence solde commission',
          solde_reel: s.solde_commission || 0,
          solde_theorique: soldeTheorique,
          ecart: Math.abs((s.solde_commission || 0) - soldeTheorique)
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. AUDIT COMMANDES VENDEURS
    // ═══════════════════════════════════════════════════════════════════════
    const commandeProblems = [];
    const commandesEnCours = commandesVendeurs.filter(c => 
      ['en_attente_validation_admin', 'validee_admin', 'attribuee_livreur', 'en_livraison'].includes(c.statut)
    );

    // Vérifier cohérence stock réservé
    const stockReserveParProduit = {};
    for (const cmd of commandesEnCours) {
      if (!stockReserveParProduit[cmd.produit_id]) {
        stockReserveParProduit[cmd.produit_id] = 0;
      }
      stockReserveParProduit[cmd.produit_id] += cmd.quantite || 0;
    }

    for (const [produitId, reserveTheorique] of Object.entries(stockReserveParProduit)) {
      const produit = produits.find(p => p.id === produitId);
      if (produit) {
        const ecart = Math.abs((produit.stock_reserve || 0) - reserveTheorique);
        if (ecart > 0) {
          commandeProblems.push({
            produit: produit.nom,
            erreur: 'stock_reserve incohérent avec commandes en cours',
            stock_reserve_reel: produit.stock_reserve || 0,
            stock_reserve_theorique: reserveTheorique,
            ecart
          });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. STATISTIQUES GLOBALES
    // ═══════════════════════════════════════════════════════════════════════
    const ventes = await db.Vente.list();
    const ventesValidees = ventes.filter(v => 
      !['annulee', 'retournee'].includes(v.statut_commande)
    );

    const stats = {
      produits: {
        total: produits.length,
        actifs: produitsActifs.length,
        rupture: produitsRupture.length,
        stock_global_total: produits.reduce((t, p) => t + (p.stock_global || 0), 0),
        stock_reserve_total: produits.reduce((t, p) => t + (p.stock_reserve || 0), 0),
        stock_disponible_total: produits.reduce((t, p) => t + Math.max(0, (p.stock_global || 0) - (p.stock_reserve || 0)), 0)
      },
      sellers: {
        total: sellers.length,
        actifs: sellers.filter(s => s.statut === 'actif').length,
        kyc_valides: sellers.filter(s => s.statut_kyc === 'valide').length,
        kyc_attente: sellers.filter(s => s.statut_kyc === 'en_attente').length,
        total_commissions_a_payer: sellers.reduce((t, s) => t + (s.solde_commission || 0), 0)
      },
      commandes_vendeurs: {
        total: commandesVendeurs.length,
        en_attente: commandesVendeurs.filter(c => c.statut === 'en_attente_validation_admin').length,
        livrees: commandesVendeurs.filter(c => c.statut === 'livree').length,
        echecs: commandesVendeurs.filter(c => c.statut === 'echec_livraison').length,
        annulees: commandesVendeurs.filter(c => c.statut === 'annulee').length
      },
      ventes_admin: {
        total: ventes.length,
        validees: ventesValidees.length,
        ca_total: ventesValidees.reduce((t, v) => t + (v.montant_total || 0), 0)
      }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 5. RÉSULTAT FINAL
    // ═══════════════════════════════════════════════════════════════════════
    const problemes = {
      stock: stockProblems,
      sellers: sellerProblems,
      commandes: commandeProblems
    };

    const totalProblemes = stockProblems.length + sellerProblems.length + commandeProblems.length;

    return Response.json({
      success: true,
      systeme_sain: totalProblemes === 0,
      total_problemes: totalProblemes,
      statistiques: stats,
      problemes_detectes: totalProblemes > 0 ? problemes : 'Aucun problème détecté ✅',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});