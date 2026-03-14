import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Validation complète du stock avant vente
 * Vérifie : stock global, stock réservé, variations, localisation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { produit_id, quantite, ville, zone, variation } = await req.json();

    if (!produit_id || !quantite || quantite < 1) {
      return Response.json({ 
        valid: false, 
        error: 'Paramètres invalides' 
      }, { status: 400 });
    }

    // Récupérer le produit
    const produit = await base44.asServiceRole.entities.Produit.get(produit_id);
    if (!produit) {
      return Response.json({ 
        valid: false, 
        error: 'Produit introuvable' 
      }, { status: 404 });
    }

    // Vérifier le statut du produit
    if (produit.statut !== 'actif') {
      return Response.json({ 
        valid: false, 
        error: `Produit ${produit.statut}` 
      });
    }

    // Calculer le stock disponible global
    const stockGlobal = produit.stock_global || 0;
    const stockReserve = produit.stock_reserve || 0;
    const stockDisponible = Math.max(0, stockGlobal - stockReserve);

    // Vérification 1 : Stock global disponible
    if (quantite > stockDisponible) {
      return Response.json({ 
        valid: false, 
        error: `Stock insuffisant (${stockDisponible} disponibles, ${stockReserve} réservés)`,
        stock_global: stockGlobal,
        stock_reserve: stockReserve,
        stock_disponible: stockDisponible
      });
    }

    // Vérification 2 : Si variations, vérifier le stock de la variation spécifique
    if (variation && produit.variations_definition?.length > 0) {
      const variationExiste = produit.variations_definition.some(v => v.attributs === variation);
      if (!variationExiste) {
        return Response.json({ 
          valid: false, 
          error: `Variation "${variation}" n'existe pas pour ce produit` 
        });
      }

      // Si stock par localisation défini, vérifier
      if (ville && zone && produit.stocks_par_localisation?.length > 0) {
        const locStock = produit.stocks_par_localisation.find(
          loc => loc.ville === ville && loc.zone === zone
        );

        if (!locStock) {
          return Response.json({ 
            valid: false, 
            error: `Produit non disponible à ${ville} - ${zone}` 
          });
        }

        const varStock = locStock.variations_stock?.find(v => v.attributs === variation);
        if (!varStock || (varStock.quantite || 0) < quantite) {
          return Response.json({ 
            valid: false, 
            error: `Stock insuffisant pour la variation "${variation}" à ${ville} - ${zone}`,
            stock_variation: varStock?.quantite || 0
          });
        }
      }
    }

    // Vérification 3 : Si localisation sans variation
    if (ville && zone && !variation && produit.stocks_par_localisation?.length > 0) {
      const locStock = produit.stocks_par_localisation.find(
        loc => loc.ville === ville && loc.zone === zone
      );

      if (!locStock) {
        return Response.json({ 
          valid: false, 
          error: `Produit non disponible à ${ville} - ${zone}` 
        });
      }

      // Stock total de la localisation
      const stockLoc = (locStock.variations_stock || []).reduce((t, v) => t + (v.quantite || 0), 0);
      if (quantite > stockLoc) {
        return Response.json({ 
          valid: false, 
          error: `Stock insuffisant à ${ville} - ${zone}`,
          stock_localisation: stockLoc
        });
      }
    }

    // ✅ Toutes les validations passées
    return Response.json({ 
      valid: true, 
      stock_disponible: stockDisponible,
      message: 'Stock validé avec succès'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});