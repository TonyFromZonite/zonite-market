import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AUDIT COMPLET DU SYSTÈME ZONITE
 * Vérifie l'intégrité des données et relations entre entités
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const rapport = {
      timestamp: new Date().toISOString(),
      statut: 'EN_COURS',
      problemes: [],
      reparations: [],
      statistiques: {}
    };

    console.log('🔍 AUDIT SYSTÈME ZONITE - DÉMARRAGE');

    // ========== 1. AUDIT SELLERS ==========
    console.log('\n📋 1. Audit Sellers...');
    const sellers = await base44.asServiceRole.entities.Seller.list();
    rapport.statistiques.total_sellers = sellers.length;
    rapport.statistiques.sellers_actifs = sellers.filter(s => s.statut === 'actif').length;
    rapport.statistiques.sellers_kyc_valide = sellers.filter(s => s.statut_kyc === 'valide').length;

    // Vérifier sellers sans email
    const sellersSansEmail = sellers.filter(s => !s.email);
    if (sellersSansEmail.length > 0) {
      rapport.problemes.push({
        type: 'SELLER_SANS_EMAIL',
        count: sellersSansEmail.length,
        ids: sellersSansEmail.map(s => s.id)
      });
    }

    // Vérifier sellers avec statut incohérent
    const sellersInconsistants = sellers.filter(s => 
      (s.statut_kyc === 'valide' && s.statut !== 'actif') ||
      (s.statut === 'actif' && s.statut_kyc !== 'valide')
    );
    if (sellersInconsistants.length > 0) {
      rapport.problemes.push({
        type: 'SELLER_STATUT_INCOHERENT',
        count: sellersInconsistants.length,
        details: sellersInconsistants.map(s => ({
          id: s.id,
          email: s.email,
          statut: s.statut,
          statut_kyc: s.statut_kyc
        }))
      });
    }

    // ========== 2. AUDIT PRODUITS ==========
    console.log('\n📦 2. Audit Produits...');
    const produits = await base44.asServiceRole.entities.Produit.list();
    rapport.statistiques.total_produits = produits.length;
    rapport.statistiques.produits_actifs = produits.filter(p => p.statut === 'actif').length;

    // Vérifier stock global vs stocks localisés
    for (const produit of produits) {
      if (produit.stocks_par_localisation && produit.stocks_par_localisation.length > 0) {
        const stockCalcule = produit.stocks_par_localisation.reduce((total, loc) => {
          const stockLoc = (loc.variations_stock || []).reduce((s, v) => s + (v.quantite || 0), 0);
          return total + stockLoc;
        }, 0);

        if (stockCalcule !== (produit.stock_global || 0)) {
          rapport.problemes.push({
            type: 'STOCK_DESYNCHRONISE',
            produit_id: produit.id,
            produit_nom: produit.nom,
            stock_global_enregistre: produit.stock_global || 0,
            stock_calcule: stockCalcule,
            difference: stockCalcule - (produit.stock_global || 0)
          });
        }
      }

      // Vérifier variations définies vs variations en stock
      if (produit.variations_definition && produit.variations_definition.length > 0) {
        const variationsDefinies = new Set(produit.variations_definition.map(v => v.attributs));
        
        if (produit.stocks_par_localisation) {
          for (const loc of produit.stocks_par_localisation) {
            if (loc.variations_stock) {
              for (const varStock of loc.variations_stock) {
                if (!variationsDefinies.has(varStock.attributs)) {
                  rapport.problemes.push({
                    type: 'VARIATION_NON_DEFINIE',
                    produit_id: produit.id,
                    produit_nom: produit.nom,
                    ville: loc.ville,
                    zone: loc.zone,
                    variation: varStock.attributs
                  });
                }
              }
            }
          }
        }
      }
    }

    // ========== 3. AUDIT VENTES ==========
    console.log('\n💰 3. Audit Ventes...');
    const ventes = await base44.asServiceRole.entities.Vente.list();
    rapport.statistiques.total_ventes = ventes.length;

    // Vérifier ventes sans localisation
    const ventesSansLocalisation = ventes.filter(v => !v.ville || !v.zone || !v.variation);
    if (ventesSansLocalisation.length > 0) {
      rapport.problemes.push({
        type: 'VENTES_SANS_LOCALISATION',
        count: ventesSansLocalisation.length,
        ids: ventesSansLocalisation.map(v => v.id)
      });
    }

    // ========== 4. AUDIT COMMANDES VENDEURS ==========
    console.log('\n🛒 4. Audit Commandes Vendeurs...');
    try {
      const commandes = await base44.asServiceRole.entities.CommandeVendeur.list();
      rapport.statistiques.total_commandes = commandes.length;
      rapport.statistiques.commandes_en_attente = commandes.filter(c => c.statut === 'en_attente_validation_admin').length;

      // Vérifier commandes sans localisation
      const commandesSansLoc = commandes.filter(c => !c.ville || !c.zone || !c.variation);
      if (commandesSansLoc.length > 0) {
        rapport.problemes.push({
          type: 'COMMANDES_SANS_LOCALISATION',
          count: commandesSansLoc.length,
          ids: commandesSansLoc.map(c => c.id)
        });
      }
    } catch (e) {
      rapport.problemes.push({
        type: 'ENTITE_COMMANDEVENDEUR_INACCESSIBLE',
        error: e.message
      });
    }

    // ========== 5. AUDIT NOTIFICATIONS ==========
    console.log('\n🔔 5. Audit Notifications...');
    const notifications = await base44.asServiceRole.entities.NotificationVendeur.list();
    rapport.statistiques.total_notifications = notifications.length;
    rapport.statistiques.notifications_non_lues = notifications.filter(n => !n.lue).length;

    // ========== RÉSUMÉ ==========
    rapport.statut = rapport.problemes.length === 0 ? 'SAIN' : 'PROBLEMES_DETECTES';
    rapport.total_problemes = rapport.problemes.length;

    console.log('\n✅ AUDIT TERMINÉ');
    console.log(`📊 Problèmes détectés: ${rapport.total_problemes}`);

    // Journal d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'system_integrity_audit',
      module: 'systeme',
      details: `Audit système complet - ${rapport.total_problemes} problèmes détectés`,
      utilisateur: user.email,
      donnees_apres: JSON.stringify(rapport)
    });

    return Response.json({
      success: true,
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur audit:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});