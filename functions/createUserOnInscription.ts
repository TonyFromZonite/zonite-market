import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Vérifier la source: fonction appelée uniquement via l'automation ou l'app interne
    const origin = req.headers.get('origin') || '';
    const authorization = req.headers.get('authorization') || '';
    
    // Accepter uniquement les appels depuis l'app elle-même ou via authentification valide
    const isFromApp = origin.includes('localhost') || origin.includes(Deno.env.get('APP_DOMAIN') || '');
    const hasValidAuth = authorization.startsWith('Bearer ');
    
    if (!isFromApp && !hasValidAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name } = await req.json();

    if (!email || !full_name) {
      return Response.json({ error: 'Email and full_name are required' }, { status: 400 });
    }

    // Valider email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
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