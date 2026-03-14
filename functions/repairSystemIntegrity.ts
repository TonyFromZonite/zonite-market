import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * RÉPARATION AUTOMATIQUE DU SYSTÈME ZONITE
 * Corrige les incohérences détectées lors de l'audit
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { mode = 'dry-run' } = await req.json();
    const isDryRun = mode === 'dry-run';

    const rapport = {
      timestamp: new Date().toISOString(),
      mode: isDryRun ? 'DRY-RUN (simulation)' : 'EXECUTION',
      reparations: []
    };

    console.log(`🔧 RÉPARATION SYSTÈME - MODE: ${rapport.mode}`);

    // ========== 1. RÉPARER STATUTS SELLERS INCOHÉRENTS ==========
    console.log('\n🔧 1. Réparation statuts Sellers...');
    const sellers = await base44.asServiceRole.entities.Seller.list();
    
    for (const seller of sellers) {
      let needsUpdate = false;
      const updates = {};

      // Règle: Si KYC validé → statut doit être actif
      if (seller.statut_kyc === 'valide' && seller.statut !== 'actif') {
        updates.statut = 'actif';
        updates.catalogue_debloque = true;
        needsUpdate = true;
      }

      // Règle: Si statut actif → KYC doit être validé
      if (seller.statut === 'actif' && seller.statut_kyc !== 'valide') {
        updates.statut_kyc = 'valide';
        needsUpdate = true;
      }

      // Règle: Si KYC en attente → statut doit être en_attente_kyc
      if (seller.statut_kyc === 'en_attente' && seller.statut !== 'en_attente_kyc') {
        updates.statut = 'en_attente_kyc';
        needsUpdate = true;
      }

      if (needsUpdate) {
        if (!isDryRun) {
          await base44.asServiceRole.entities.Seller.update(seller.id, updates);
        }
        rapport.reparations.push({
          type: 'SELLER_STATUT_CORRIGE',
          seller_id: seller.id,
          email: seller.email,
          changements: updates
        });
      }
    }

    // ========== 2. RECALCULER STOCKS GLOBAUX ==========
    console.log('\n🔧 2. Recalcul stocks globaux...');
    const produits = await base44.asServiceRole.entities.Produit.list();
    
    for (const produit of produits) {
      if (produit.stocks_par_localisation && produit.stocks_par_localisation.length > 0) {
        const stockCalcule = produit.stocks_par_localisation.reduce((total, loc) => {
          const stockLoc = (loc.variations_stock || []).reduce((s, v) => s + (v.quantite || 0), 0);
          return total + stockLoc;
        }, 0);

        if (stockCalcule !== (produit.stock_global || 0)) {
          const updates = {
            stock_global: stockCalcule,
            statut: stockCalcule > 0 ? 'actif' : 'rupture'
          };

          if (!isDryRun) {
            await base44.asServiceRole.entities.Produit.update(produit.id, updates);
          }

          rapport.reparations.push({
            type: 'STOCK_GLOBAL_RECALCULE',
            produit_id: produit.id,
            produit_nom: produit.nom,
            ancien_stock: produit.stock_global || 0,
            nouveau_stock: stockCalcule,
            difference: stockCalcule - (produit.stock_global || 0)
          });
        }
      }
    }

    // ========== 3. NETTOYER VARIATIONS ORPHELINES ==========
    console.log('\n🔧 3. Nettoyage variations orphelines...');
    
    for (const produit of produits) {
      if (produit.variations_definition && produit.variations_definition.length > 0) {
        const variationsDefinies = new Set(produit.variations_definition.map(v => v.attributs));
        let needsCleanup = false;
        const nouveauxStocks = [];

        if (produit.stocks_par_localisation) {
          for (const loc of produit.stocks_par_localisation) {
            const variationsValides = (loc.variations_stock || []).filter(v => 
              variationsDefinies.has(v.attributs)
            );

            if (variationsValides.length !== (loc.variations_stock || []).length) {
              needsCleanup = true;
            }

            nouveauxStocks.push({
              ...loc,
              variations_stock: variationsValides
            });
          }

          if (needsCleanup) {
            if (!isDryRun) {
              await base44.asServiceRole.entities.Produit.update(produit.id, {
                stocks_par_localisation: nouveauxStocks
              });
            }

            rapport.reparations.push({
              type: 'VARIATIONS_ORPHELINES_SUPPRIMEES',
              produit_id: produit.id,
              produit_nom: produit.nom
            });
          }
        }
      }
    }

    // ========== 4. INITIALISER CHAMPS MANQUANTS SELLERS ==========
    console.log('\n🔧 4. Initialisation champs manquants Sellers...');
    
    for (const seller of sellers) {
      const updates = {};
      let needsUpdate = false;

      if (seller.solde_commission === undefined) {
        updates.solde_commission = 0;
        needsUpdate = true;
      }
      if (seller.total_commissions_gagnees === undefined) {
        updates.total_commissions_gagnees = 0;
        needsUpdate = true;
      }
      if (seller.nombre_ventes === undefined) {
        updates.nombre_ventes = 0;
        needsUpdate = true;
      }
      if (seller.chiffre_affaires_genere === undefined) {
        updates.chiffre_affaires_genere = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        if (!isDryRun) {
          await base44.asServiceRole.entities.Seller.update(seller.id, updates);
        }

        rapport.reparations.push({
          type: 'SELLER_CHAMPS_INITIALISES',
          seller_id: seller.id,
          email: seller.email,
          champs_ajoutes: Object.keys(updates)
        });
      }
    }

    // ========== RÉSUMÉ ==========
    rapport.total_reparations = rapport.reparations.length;
    console.log(`\n✅ RÉPARATION TERMINÉE - ${rapport.total_reparations} actions`);

    if (!isDryRun) {
      // Journal d'audit
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'system_integrity_repair',
        module: 'systeme',
        details: `Réparation système - ${rapport.total_reparations} corrections effectuées`,
        utilisateur: user.email,
        donnees_apres: JSON.stringify(rapport)
      });
    }

    return Response.json({
      success: true,
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur réparation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});