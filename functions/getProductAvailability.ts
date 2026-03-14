import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Récupère la disponibilité complète d'un produit
 * Retourne : villes → zones → variations avec stock
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { produit_id } = await req.json();

    if (!produit_id) {
      return Response.json({ error: 'produit_id requis' }, { status: 400 });
    }

    const produit = await base44.asServiceRole.entities.Produit.get(produit_id);
    if (!produit) {
      return Response.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    if (produit.statut !== 'actif') {
      return Response.json({ 
        disponible: false,
        raison: `Produit ${produit.statut}`,
        villes: []
      });
    }

    // Structure de disponibilité par ville → zone → variation
    const disponibilite = {
      produit_id: produit.id,
      produit_nom: produit.nom,
      prix_gros: produit.prix_gros || 0,
      prix_vente: produit.prix_vente || 0,
      variations_definition: produit.variations_definition || [],
      villes: []
    };

    // Traiter stocks_par_localisation
    if (produit.stocks_par_localisation && produit.stocks_par_localisation.length > 0) {
      const villesMap = new Map();

      for (const loc of produit.stocks_par_localisation) {
        const ville = loc.ville;
        const zone = loc.zone;
        
        if (!villesMap.has(ville)) {
          villesMap.set(ville, {
            ville,
            zones: []
          });
        }

        const villeData = villesMap.get(ville);
        
        // Calculer stock total de la zone
        const variationsStock = loc.variations_stock || [];
        const stockTotal = variationsStock.reduce((sum, v) => sum + (v.quantite || 0), 0);

        // Filtrer variations avec stock > 0
        const variationsDisponibles = variationsStock
          .filter(v => (v.quantite || 0) > 0)
          .map(v => ({
            attributs: v.attributs,
            quantite: v.quantite
          }));

        if (variationsDisponibles.length > 0) {
          villeData.zones.push({
            zone,
            stock_total: stockTotal,
            seuil_alerte: loc.seuil_alerte || 0,
            variations: variationsDisponibles
          });
        }
      }

      // Convertir Map en Array et filtrer villes sans zones disponibles
      disponibilite.villes = Array.from(villesMap.values())
        .filter(v => v.zones.length > 0)
        .map(v => ({
          ville: v.ville,
          zones_disponibles: v.zones.length,
          zones: v.zones
        }));
    }

    const disponible = disponibilite.villes.length > 0;

    return Response.json({
      disponible,
      raison: disponible ? null : 'Aucun stock disponible dans aucune localisation',
      ...disponibilite
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});