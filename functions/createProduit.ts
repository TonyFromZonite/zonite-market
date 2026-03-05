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

    const data = await req.json();
    
    // Validation stricte
    if (!data.nom?.trim()) {
      return Response.json({ error: 'Nom du produit requis' }, { status: 400 });
    }
    if (!data.reference?.trim()) {
      return Response.json({ error: 'Référence requise' }, { status: 400 });
    }
    if (!data.prix_achat || data.prix_achat <= 0) {
      return Response.json({ error: 'Prix d\'achat invalide' }, { status: 400 });
    }

    const produit = await base44.asServiceRole.entities.Produit.create(data);
    
    return Response.json({ success: true, produit }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});