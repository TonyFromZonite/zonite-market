import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const produitId = payload.produitId;

    if (!produitId) {
      return Response.json({ error: 'produitId required' }, { status: 400 });
    }

    // Vérifier que le produit existe
    let produit;
    try {
      produit = await base44.asServiceRole.entities.Produit.get(produitId);
    } catch (err) {
      return Response.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    // Utiliser asServiceRole pour ignorer les RLS
    await base44.asServiceRole.entities.Produit.delete(produitId);

    // Audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: "Produit supprimé",
      module: "produit",
      details: `Produit ${produit.nom} supprimé via fonction backend`,
      entite_id: produitId,
      utilisateur: (await base44.auth.me())?.email || "système"
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    console.error('deleteProduit error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});