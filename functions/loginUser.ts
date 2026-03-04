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

      // Créer ou mettre à jour le User Base44 avec rôle vendeur
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers.length === 0) {
        await base44.asServiceRole.entities.User.create({
          email,
          full_name: compte.nom_complet,
          role: 'vendeur'
        });
      }

      return Response.json({
        success: true,
        session: { email, id: compte.id, role: 'vendeur', type: 'vendeur' }
      });
    }

    // Admin and SousAdmin login
    if (userType === 'admin') {
      // Try Admin principal first
      const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });
      if (configs.length > 0 && (email === 'admin' || email === 'administrateur')) {
        const adminHash = configs[0].valeur;
        const passwordMatch = await bcrypt.compare(password, adminHash);
        if (passwordMatch) {
          // Créer ou mettre à jour le User Base44 avec rôle admin
          const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
          if (existingUsers.length === 0) {
            await base44.asServiceRole.entities.User.create({
              email,
              full_name: 'Administrateur Principal',
              role: 'admin'
            });
          }

          return Response.json({
            success: true,
            session: { email, role: 'admin', permissions: [], type: 'admin', loggedAt: new Date().toISOString() }
          });
        }
      }

      // Try SousAdmin
      const sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ statut: 'actif' });
      const sousAdmin = sousAdmins.find(sa => (sa.username === email || sa.email === email));
      
      if (sousAdmin) {
        const passwordMatch = await bcrypt.compare(password, sousAdmin.mot_de_passe_hash);
        if (passwordMatch) {
          // Créer ou mettre à jour le User Base44 avec rôle sous_admin
          const existingUsers = await base44.asServiceRole.entities.User.filter({ email: sousAdmin.email });
          if (existingUsers.length === 0) {
            await base44.asServiceRole.entities.User.create({
              email: sousAdmin.email,
              full_name: sousAdmin.nom_complet,
              role: 'sous_admin',
              permissions: sousAdmin.permissions || []
            });
          }

          return Response.json({
            success: true,
            session: { email: sousAdmin.email, id: sousAdmin.id, role: 'sous_admin', permissions: sousAdmin.permissions || [], type: 'admin' }
          });
        }
      }

      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});