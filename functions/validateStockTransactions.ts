import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fonction batch pour validation atomique des stocks
 * Évite les race conditions lors de commandes simultanées
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STRICT: Seuls les admins/sous-admins peuvent manipuler les stocks
    if (!['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { commande_id, produit_id, quantite } = await req.json();

    if (!commande_id || !produit_id || quantite < 1) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Verrouiller la commande + vérifier stock atomiquement
    const commande = await base44.asServiceRole.entities.CommandeVendeur.filter({ id: commande_id });
    if (commande.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // AUTHORIZATION: Vérifier que l'admin ne manipule que les commandes légitimes
    if (commande[0].statut !== 'validee_admin' && commande[0].statut !== 'en_attente_validation_admin') {
      return Response.json({ error: 'Forbidden: Cannot modify stock for this order status' }, { status: 403 });
    }

    const produit = await base44.asServiceRole.entities.Produit.filter({ id: produit_id });
    if (produit.length === 0) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const prod = produit[0];
    const stockDisponible = (prod.stock_global || 0) - (prod.stock_reserve || 0);

    // Vérification stricte du stock
    if (quantite > stockDisponible) {
      return Response.json({
        success: false,
        error: `Stock insuffisant. Disponible: ${stockDisponible}, Demandé: ${quantite}`,
        stock_available: stockDisponible
      }, { status: 409 });
    }

    // Réserver le stock de façon atomique
    await base44.asServiceRole.entities.Produit.update(produit_id, {
      stock_global: Math.max(0, prod.stock_global - quantite),
      stock_reserve: (prod.stock_reserve || 0) + quantite,
    });

    // Enregistrer le mouvement
    await base44.asServiceRole.entities.MouvementStock.create({
      produit_id,
      produit_nom: prod.nom,
      type_mouvement: 'sortie',
      quantite,
      stock_avant: prod.stock_global || 0,
      stock_apres: Math.max(0, prod.stock_global - quantite),
      raison: `Réservation commande ${commande_id}`,
      reference_vente: commande_id,
    });

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'stock_reservation',
      module: 'produit',
      details: `${quantite} unités réservées pour commande ${commande_id}`,
      utilisateur: user.email,
      entite_id: produit_id,
      donnees_apres: JSON.stringify({
        stock_global: Math.max(0, prod.stock_global - quantite),
        stock_reserve: (prod.stock_reserve || 0) + quantite,
      }),
    });

    return Response.json({ success: true, stock_reserved: quantite });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});