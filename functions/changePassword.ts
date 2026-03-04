import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldPassword, newPassword, userType } = await req.json();

    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return Response.json({ error: 'Invalid password format' }, { status: 400 });
    }

    // Vendeur password change
    if (userType === 'vendeur') {
      const comptes = await base44.entities.CompteVendeur.filter({ user_email: user.email });
      if (comptes.length === 0) {
        return Response.json({ error: 'Vendor account not found' }, { status: 404 });
      }

      const compte = comptes[0];
      const passwordMatch = await bcrypt.compare(oldPassword, compte.mot_de_passe_hash);
      if (!passwordMatch) {
        return Response.json({ error: 'Old password is incorrect' }, { status: 401 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await base44.entities.CompteVendeur.update(compte.id, { mot_de_passe_hash: hashedPassword });

      return Response.json({ success: true, message: 'Password changed successfully' });
    }

    // Admin password change
    if (userType === 'admin' && user.role === 'admin') {
      const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });
      if (configs.length === 0) {
        return Response.json({ error: 'Admin password not configured' }, { status: 404 });
      }

      const passwordMatch = await bcrypt.compare(oldPassword, configs[0].valeur);
      if (!passwordMatch) {
        return Response.json({ error: 'Old password is incorrect' }, { status: 401 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await base44.asServiceRole.entities.ConfigApp.update(configs[0].id, { valeur: hashedPassword });

      return Response.json({ success: true, message: 'Password changed successfully' });
    }

    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});