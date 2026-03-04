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

    // Unified login for all user types
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ error: 'Account not found' }, { status: 401 });
    }

    const user = users[0];

    // Vendeur login
    if (userType === 'vendeur' && user.role === 'vendeur') {
      const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
      if (comptes.length === 0) {
        return Response.json({ error: 'Vendor account not found' }, { status: 401 });
      }

      const compte = comptes[0];
      if (compte.statut === 'suspendu') {
        return Response.json({ error: 'Account suspended' }, { status: 403 });
      }

      // Check if account is pending KYC approval
      if (compte.statut === 'en_attente_kyc') {
        return Response.json({
          success: false,
          pendingApproval: true,
          message: 'Votre compte est en attente de validation KYC.'
        });
      }

      const passwordMatch = await bcrypt.compare(password, compte.mot_de_passe_hash);
      if (!passwordMatch) {
        return Response.json({ error: 'Invalid password' }, { status: 401 });
      }

      return Response.json({
        success: true,
        session: { email, id: user.id, role: 'vendeur', type: 'vendeur' }
      });
    }

    // Admin and SousAdmin login
    if (userType === 'admin' && (user.role === 'admin' || user.role === 'sous_admin')) {
      // Get password hash from CompteVendeur or SousAdmin (legacy) or User (new)
      let passwordHash = null;

      if (user.role === 'admin') {
        const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });
        if (configs.length > 0) passwordHash = configs[0].valeur;
      } else if (user.role === 'sous_admin') {
        const sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ email, statut: 'actif' });
        if (sousAdmins.length > 0) passwordHash = sousAdmins[0].mot_de_passe_hash;
      }

      if (!passwordHash) {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const passwordMatch = await bcrypt.compare(password, passwordHash);
      if (!passwordMatch) {
        return Response.json({ error: 'Invalid password' }, { status: 401 });
      }

      return Response.json({
        success: true,
        session: { email, id: user.id, role: user.role, permissions: user.permissions || [], type: 'admin' }
      });
    }

    return Response.json({ error: 'Invalid credentials or role mismatch' }, { status: 401 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});