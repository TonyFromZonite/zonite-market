import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Search for seller
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    
    if (sellers.length === 0) {
      return Response.json({ 
        found: false, 
        email,
        message: 'No seller account found with this email'
      }, { status: 200 });
    }

    const seller = sellers[0];
    return Response.json({ 
      found: true,
      id: seller.id,
      email: seller.email,
      nom_complet: seller.nom_complet,
      seller_status: seller.seller_status,
      statut_kyc: seller.statut_kyc,
      training_completed: seller.training_completed
    }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});