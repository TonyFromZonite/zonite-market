import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { email, password, userType } = await req.json();

    if (!email || !password || !userType) {
      return Response.json({ error: 'Email, password, and userType are required' }, { status: 400 });
    }

    // Vendeur login
    if (userType === 'vendeur') {
      const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
      if (comptes.length === 0) {
        return Response.json({ error: 'Account not found' }, { status: 401 });
      }

      const compte = comptes[0];
      if (compte.statut === 'suspendu') {
        return Response.json({ error: 'Account suspended' }, { status: 403 });
      }

      const passwordMatch = await bcrypt.compare(password, compte.mot_de_passe_hash);
      if (!passwordMatch) {
        return Response.json({ error: 'Invalid password' }, { status: 401 });
      }

      return Response.json({
        success: true,
        session: { email: compte.user_email, id: compte.id, type: 'vendeur' }
      });
    }

    // Admin and SousAdmin login
    if (userType === 'admin') {
      // Try admin first
      const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });
      if (configs.length > 0 && (email === 'admin' || email === 'administrateur')) {
        const adminHash = configs[0].valeur;
        const passwordMatch = await bcrypt.compare(password, adminHash);
        if (passwordMatch) {
          return Response.json({
            success: true,
            session: { role: 'admin', type: 'admin', loggedAt: new Date().toISOString() }
          });
        }
      }

      // Try SousAdmin
      const sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ statut: 'actif' });
      const sousAdmin = sousAdmins.find(sa => (sa.username === email || sa.email === email));
      
      if (sousAdmin) {
        const passwordMatch = await bcrypt.compare(password, sousAdmin.mot_de_passe_hash);
        if (passwordMatch) {
          return Response.json({
            success: true,
            session: sousAdmin
          });
        }
      }

      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return Response.json({ error: 'Invalid userType' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});