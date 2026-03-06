import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { produitId, data } = await req.json();

    if (!produitId) {
      return Response.json({ error: 'produitId requis' }, { status: 400 });
    }

    const produit = await base44.asServiceRole.entities.Produit.update(produitId, data);
    return Response.json({ success: true, produit });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});