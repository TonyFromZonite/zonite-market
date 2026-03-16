import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { user_id, user_email, new_role } = await req.json();

    if (!new_role || (!user_id && !user_email)) {
      return Response.json({ error: 'Missing user identifier or new_role' }, { status: 400 });
    }

    // Resolve user_id from email if not provided
    let targetUserId = user_id;
    if (!targetUserId && user_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
      if (!users.length) return Response.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
      targetUserId = users[0].id;
    }

    // Update user role
    const updatedUser = await base44.asServiceRole.entities.User.update(targetUserId, { 
      role: new_role 
    });

    return Response.json({ 
      success: true, 
      message: `Rôle de l'utilisateur changé en ${new_role}`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});