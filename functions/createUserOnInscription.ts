import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, full_name } = await req.json();

    if (!email || !full_name) {
      return Response.json({ error: 'Email and full_name are required' }, { status: 400 });
    }

    // Check if User already exists
    const existing = await base44.asServiceRole.entities.User.filter({ email });
    if (existing.length > 0) {
      return Response.json({ success: true, message: 'User already exists' });
    }

    // Create User Base44 with vendeur role
    await base44.asServiceRole.entities.User.create({
      email,
      full_name,
      role: 'vendeur'
    });

    return Response.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});