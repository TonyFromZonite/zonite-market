import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { email, full_name } = payload;

    // Vérifier que l'appel vient d'une automation enregistrée (seule source fiable)
    const isValidAutomation = payload.event && 
      typeof payload.event === 'object' && 
      payload.event.type && 
      payload.event.entity_name && 
      payload.event.entity_id;
    
    if (!isValidAutomation) {
      return Response.json({ error: 'Unauthorized: Invalid automation context' }, { status: 401 });
    }

    if (!email || !full_name) {
      return Response.json({ error: 'Email and full_name are required' }, { status: 400 });
    }

    // Sanitization stricte
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
      action: 'User vendeur créé',
      module: 'systeme',
      details: `Nouvel utilisateur vendeur: ${email}`,
    });

    return Response.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});