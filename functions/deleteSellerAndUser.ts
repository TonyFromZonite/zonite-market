import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { seller_id, seller_email } = await req.json();

    if (!seller_id || !seller_email) {
      return Response.json({ error: 'Missing seller_id or seller_email' }, { status: 400 });
    }

    // 1. Delete the Seller entity
    await base44.asServiceRole.entities.Seller.delete(seller_id);

    // 2. Find and delete the corresponding User
    const users = await base44.asServiceRole.entities.User.filter({ email: seller_email });
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.delete(users[0].id);
    }

    return Response.json({ 
      success: true, 
      message: `Vendeur et compte utilisateur supprimés avec succès` 
    });
  } catch (error) {
    console.error('Error deleting seller and user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});