import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fonction de test pour vérifier le système de gestion de stock
 * Teste : stock_global, stock_reserve, stock disponible
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès réservé aux admins' }, { status: 403 });
    }

    const produits = await base44.asServiceRole.entities.Produit.list();
    
    const rapport = produits.map(p => ({
      nom: p.nom,
      reference: p.reference,
      stock_global: p.stock_global || 0,
      stock_reserve: p.stock_reserve || 0,
      stock_disponible: Math.max(0, (p.stock_global || 0) - (p.stock_reserve || 0)),
      alerte: ((p.stock_global || 0) - (p.stock_reserve || 0)) <= (p.seuil_alerte_global || 5),
      statut: p.statut
    }));

    const stats = {
      total_produits: produits.length,
      produits_actifs: produits.filter(p => p.statut === 'actif').length,
      produits_rupture: rapport.filter(p => p.stock_disponible === 0).length,
      produits_alerte: rapport.filter(p => p.alerte && p.stock_disponible > 0).length,
      stock_global_total: rapport.reduce((s, p) => s + p.stock_global, 0),
      stock_reserve_total: rapport.reduce((s, p) => s + p.stock_reserve, 0),
      stock_disponible_total: rapport.reduce((s, p) => s + p.stock_disponible, 0)
    };

    return Response.json({ success: true, stats, produits: rapport });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});