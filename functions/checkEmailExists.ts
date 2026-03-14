import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier dans Seller
    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length > 0) {
      return Response.json({ exists: true });
    }

    // Vérifier dans User (Base44)
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        return Response.json({ exists: true });
      }
    } catch (_) {
      // Continuer si User filter échoue
    }

    return Response.json({ exists: false });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});