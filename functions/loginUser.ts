import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Seller authentication via Seller entity
const authenticateSeller = async (base44, email, password) => {
  const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
  if (sellers.length === 0) {
    return { success: false, error: 'Email ou mot de passe incorrect' };
  }

  const seller = sellers[0];
  
  // Vérifier le mot de passe (async pour éviter CPU timeout)
  const passwordMatch = await bcrypt.compare(password, seller.mot_de_passe_hash);
  if (!passwordMatch) {
    return { success: false, error: 'Email ou mot de passe incorrect' };
  }

  // Vérifier le statut KYC
  if (seller.statut_kyc !== 'valide') {
    return { 
      success: false, 
      error: 'Votre compte est en attente de validation KYC',
      status_code: 'kyc_pending'
    };
  }

  // Vérifier le statut du compte
  if (seller.statut !== 'actif') {
    return { success: false, error: 'Votre compte est suspendu' };
  }

  return { success: true, seller };
};

// Admin/Sub-admin authentication
const authenticateAdmin = async (base44, username, password) => {
  // Vérifier d'abord les sous-admins
  const sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ username });
  if (sousAdmins.length > 0) {
    const sousAdmin = sousAdmins[0];
    const passwordMatch = await bcrypt.compare(password, sousAdmin.mot_de_passe_hash);
    if (passwordMatch && sousAdmin.statut === 'actif') {
      // Audit log
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'Connexion sous-admin',
        module: 'systeme',
        details: `Sous-admin ${sousAdmin.nom_complet} connecté`,
        utilisateur: sousAdmin.email,
      }).catch(() => {});

      return { success: true, type: 'sous_admin', data: sousAdmin };
    }
    return { success: false, error: 'Identifiants invalides' };
  }

  // Vérifier l'admin principal via ConfigApp
  const adminPasswordConfig = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });
  if (adminPasswordConfig.length > 0) {
    const passwordMatch = await bcrypt.compare(password, adminPasswordConfig[0].valeur);
    if (passwordMatch && (username === 'admin' || username === 'tonykodjeu@gmail.com')) {
      // Audit log
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'Connexion admin',
        module: 'systeme',
        details: 'Administrateur principal connecté',
        utilisateur: username,
      }).catch(() => {});

      return { success: true, type: 'admin', data: { username: 'admin' } };
    }
  }

  return { success: false, error: 'Identifiants invalides' };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, password, username, userType } = body;

    // Seller login
    if (userType === 'vendeur' && email && password) {
      const result = await authenticateSeller(base44, email, password);
      return Response.json(result, { status: result.success ? 200 : 400 });
    }

    // Admin/Sub-admin login (accept email as username if not provided)
    if (userType === 'admin' && password) {
      const adminUser = username || email;
      const result = await authenticateAdmin(base44, adminUser, password);
      return Response.json(result, { status: result.success ? 200 : 400 });
    }

    return Response.json({ error: 'Identifiants invalides' }, { status: 400 });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});