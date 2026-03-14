import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Récupère le stock disponible réel d'un produit
 * Retourne : stock_global, stock_reserve, stock_disponible
 * Optionnel : filtrer par ville, zone, variation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { produit_id, ville, zone, variation } = await req.json();

    if (!produit_id) {
      return Response.json({ error: 'produit_id requis' }, { status: 400 });
    }

    const produit = await base44.asServiceRole.entities.Produit.get(produit_id);
    if (!produit) {
      return Response.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    const stockGlobal = produit.stock_global || 0;
    const stockReserve = produit.stock_reserve || 0;
    const stockDisponible = Math.max(0, stockGlobal - stockReserve);

    const result = {
      produit_nom: produit.nom,
      stock_global: stockGlobal,
      stock_reserve: stockReserve,
      stock_disponible: stockDisponible,
      statut: produit.statut,
      variations: []
    };

    // Si demande spécifique pour une localisation
    if (ville && zone && produit.stocks_par_localisation?.length > 0) {
      const loc = produit.stocks_par_localisation.find(
        l => l.ville === ville && l.zone === zone
      );

      if (loc) {
        result.localisation = {
          ville: loc.ville,
          zone: loc.zone,
          variations_stock: loc.variations_stock || []
        };

        // Si variation demandée
        if (variation) {
          const varStock = loc.variations_stock?.find(v => v.attributs === variation);
          result.variation_stock = varStock ? varStock.quantite : 0;
        }
      } else {
        result.localisation = null;
        result.disponible_localisation = false;
      }
    }

    // Lister toutes les variations disponibles
    if (produit.variations_definition?.length > 0) {
      result.variations = produit.variations_definition.map(v => ({
        attributs: v.attributs,
        disponible: true // À affiner si on gère le stock par variation globalement
      }));
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});