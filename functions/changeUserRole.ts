import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { user_id, new_role } = await req.json();

    if (!user_id || !new_role) {
      return Response.json({ error: 'Missing user_id or new_role' }, { status: 400 });
    }

    // Update user role
    const updatedUser = await base44.asServiceRole.entities.User.update(user_id, { 
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