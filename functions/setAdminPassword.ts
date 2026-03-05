import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { password } = await req.json();

    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Hash the password
    const hash = await bcrypt.hash(password, 10);

    // Check if config exists
    const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });

    if (configs.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.ConfigApp.update(configs[0].id, {
        valeur: hash,
        description: 'Hash du mot de passe administrateur principal'
      });
    } else {
      // Create new
      await base44.asServiceRole.entities.ConfigApp.create({
        cle: 'admin_password_hash',
        valeur: hash,
        description: 'Hash du mot de passe administrateur principal'
      });
    }

    return Response.json({ success: true, message: 'Admin password updated successfully' });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});