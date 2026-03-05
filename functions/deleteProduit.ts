import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { produitId } = await req.json();
    
    if (!produitId) {
      return Response.json({ error: 'Produit ID requis' }, { status: 400 });
    }

    // Soft delete : marquer comme supprimé
    await base44.asServiceRole.entities.Produit.update(produitId, { statut: 'supprime' });
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});