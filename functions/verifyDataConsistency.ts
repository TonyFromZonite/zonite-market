import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Audit et vérification de la cohérence des données
 * Vérifie les enregistrements orphelins et les incohérences RLS
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const rapport = {
      timestamp: new Date().toISOString(),
      entites_verifiees: [],
      problemes_detectes: [],
      total_enregistrements: {},
      recommendations: []
    };

    // Vérifier toutes les entités principales
    const entites = [
      'Produit',
      'Seller',
      'Zone',
      'Coursier',
      'Vente',
      'CommandeVendeur',
      'CommandeVente',
      'Categorie',
      'Livraison',
      'JournalAudit'
    ];

    for (const entite of entites) {
      try {
        // Compter via service role (accès complet)
        const all = await base44.asServiceRole.entities[entite].list();
        
        // Compter via user role (avec RLS)
        const userVisible = await base44.entities[entite].list();

        rapport.total_enregistrements[entite] = {
          total_reel: all.length,
          visible_user: userVisible.length,
          difference: all.length - userVisible.length
        };

        rapport.entites_verifiees.push(entite);

        // Détecter les enregistrements avec statut "supprime"
        if (entite === 'Produit') {
          const supprimes = all.filter(p => p.statut === 'supprime');
          if (supprimes.length > 0) {
            rapport.problemes_detectes.push({
              entite: 'Produit',
              type: 'soft_delete',
              count: supprimes.length,
              description: `${supprimes.length} produits avec statut "supprime" encore présents`,
              ids: supprimes.map(p => p.id)
            });
          }
        }

        // Détecter les vendeurs suspendus
        if (entite === 'Seller') {
          const suspendus = all.filter(s => s.statut === 'suspendu');
          if (suspendus.length > 0) {
            rapport.problemes_detectes.push({
              entite: 'Seller',
              type: 'suspended',
              count: suspendus.length,
              description: `${suspendus.length} vendeurs suspendus`
            });
          }
        }

      } catch (error) {
        rapport.problemes_detectes.push({
          entite,
          type: 'access_error',
          error: error.message
        });
      }
    }

    // Vérifier les références orphelines
    try {
      const produits = await base44.asServiceRole.entities.Produit.list();
      const categories = await base44.asServiceRole.entities.Categorie.list();
      const categorieIds = new Set(categories.map(c => c.id));

      const produitsOrphelins = produits.filter(p => 
        p.categorie_id && !categorieIds.has(p.categorie_id)
      );

      if (produitsOrphelins.length > 0) {
        rapport.problemes_detectes.push({
          entite: 'Produit',
          type: 'orphan_reference',
          count: produitsOrphelins.length,
          description: `${produitsOrphelins.length} produits avec catégorie inexistante`,
          ids: produitsOrphelins.map(p => p.id)
        });
      }
    } catch (error) {
      console.error('Erreur vérification orphelins:', error);
    }

    // Recommandations
    if (rapport.problemes_detectes.length === 0) {
      rapport.recommendations.push('✅ Aucun problème de cohérence détecté');
    } else {
      rapport.recommendations.push(
        '⚠️ Problèmes détectés - utiliser la fonction repairDataConsistency pour corriger'
      );
    }

    return Response.json({
      success: true,
      rapport
    });

  } catch (error) {
    console.error('Erreur audit:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});