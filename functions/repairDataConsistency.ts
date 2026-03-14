import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Répare les incohérences de données détectées
 * Mode dry_run pour prévisualiser les changements
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { dry_run = true, actions = [] } = await req.json();

    const resultat = {
      timestamp: new Date().toISOString(),
      mode: dry_run ? 'dry_run' : 'execution',
      actions_effectuees: [],
      erreurs: []
    };

    // Action 1: Supprimer définitivement les produits avec statut "supprime"
    if (!actions.length || actions.includes('clean_deleted_products')) {
      try {
        const produits = await base44.asServiceRole.entities.Produit.list();
        const aSupprimer = produits.filter(p => p.statut === 'supprime');

        if (aSupprimer.length > 0) {
          if (!dry_run) {
            for (const produit of aSupprimer) {
              await base44.asServiceRole.entities.Produit.delete(produit.id);
            }
          }

          resultat.actions_effectuees.push({
            action: 'clean_deleted_products',
            description: 'Suppression définitive des produits marqués "supprime"',
            count: aSupprimer.length,
            ids: aSupprimer.map(p => p.id),
            executed: !dry_run
          });
        }
      } catch (error) {
        resultat.erreurs.push({
          action: 'clean_deleted_products',
          error: error.message
        });
      }
    }

    // Action 2: Corriger les références orphelines de catégories
    if (!actions.length || actions.includes('fix_orphan_categories')) {
      try {
        const produits = await base44.asServiceRole.entities.Produit.list();
        const categories = await base44.asServiceRole.entities.Categorie.list();
        const categorieIds = new Set(categories.map(c => c.id));

        const produitsOrphelins = produits.filter(p => 
          p.categorie_id && !categorieIds.has(p.categorie_id)
        );

        if (produitsOrphelins.length > 0) {
          if (!dry_run) {
            for (const produit of produitsOrphelins) {
              await base44.asServiceRole.entities.Produit.update(produit.id, {
                categorie_id: null,
                categorie_nom: null
              });
            }
          }

          resultat.actions_effectuees.push({
            action: 'fix_orphan_categories',
            description: 'Suppression des références à des catégories inexistantes',
            count: produitsOrphelins.length,
            ids: produitsOrphelins.map(p => p.id),
            executed: !dry_run
          });
        }
      } catch (error) {
        resultat.erreurs.push({
          action: 'fix_orphan_categories',
          error: error.message
        });
      }
    }

    // Action 3: Nettoyer les zones inactives sans coursiers
    if (!actions.length || actions.includes('clean_inactive_zones')) {
      try {
        const zones = await base44.asServiceRole.entities.Zone.list();
        const coursiers = await base44.asServiceRole.entities.Coursier.list();

        const zonesInactives = zones.filter(z => z.statut === 'inactif');
        const zonesUtilisees = new Set();

        coursiers.forEach(c => {
          if (c.zones_couvertes) {
            c.zones_couvertes.forEach(zc => {
              if (zc.zone_id) zonesUtilisees.add(zc.zone_id);
            });
          }
        });

        const zonesASupprimer = zonesInactives.filter(z => 
          !zonesUtilisees.has(z.id)
        );

        if (zonesASupprimer.length > 0) {
          if (!dry_run) {
            for (const zone of zonesASupprimer) {
              await base44.asServiceRole.entities.Zone.delete(zone.id);
            }
          }

          resultat.actions_effectuees.push({
            action: 'clean_inactive_zones',
            description: 'Suppression des zones inactives non utilisées',
            count: zonesASupprimer.length,
            ids: zonesASupprimer.map(z => z.id),
            executed: !dry_run
          });
        }
      } catch (error) {
        resultat.erreurs.push({
          action: 'clean_inactive_zones',
          error: error.message
        });
      }
    }

    resultat.summary = {
      total_actions: resultat.actions_effectuees.length,
      total_erreurs: resultat.erreurs.length,
      message: dry_run 
        ? '⚠️ Mode simulation - aucune modification effectuée. Relancer avec dry_run=false pour exécuter.'
        : '✅ Réparations effectuées avec succès'
    };

    return Response.json({
      success: true,
      resultat
    });

  } catch (error) {
    console.error('Erreur réparation:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});