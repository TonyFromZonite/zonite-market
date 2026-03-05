import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const email = payload.email || payload.data?.user_email;
    const full_name = payload.full_name || payload.data?.nom_complet;

    if (!email || !full_name) {
      return Response.json({ error: 'Email and full_name are required' }, { status: 400 });
    }

    if (typeof email !== 'string' || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (typeof full_name !== 'string' || full_name.length < 2 || full_name.length > 100) {
      return Response.json({ error: 'Invalid name (2-100 characters)' }, { status: 400 });
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

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'user_vendeur_cree',
      module: 'systeme',
      details: `Nouvel utilisateur vendeur créé: ${email}`,
      utilisateur: email,
    }).catch(() => {});

    return Response.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error('createUserOnInscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});