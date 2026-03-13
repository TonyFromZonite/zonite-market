import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin ou sous_admin
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Récupérer tous les vendeurs depuis Seller
    const sellers = await base44.asServiceRole.entities.Seller.list('-created_date');

    return Response.json(sellers);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});