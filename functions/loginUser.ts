import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

// Inline helpers (no local imports allowed in Deno Deploy)
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function checkRateLimit(base44, identifier, maxRequests, windowMs) {
  const windowStart = Date.now() - windowMs;
  try {
    const recentAttempts = await base44.asServiceRole.entities.JournalAudit.filter({
      action: `rate_limit_check:${identifier}`,
      created_date: { $gte: new Date(windowStart).toISOString() }
    });
    if (recentAttempts.length >= maxRequests) return { allowed: false };
    await base44.asServiceRole.entities.JournalAudit.create({
      action: `rate_limit_check:${identifier}`,
      module: 'systeme',
      details: `Rate limit check for ${identifier}`,
      utilisateur: identifier,
    }).catch(() => {});
    return { allowed: true };
  } catch (_) {
    return { allowed: true };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password, userType } = await req.json();

    if (!email || !password || !userType) {
      return Response.json({ error: 'Email, password, and userType are required' }, { status: 400 });
    }

    // Rate limiting: max 5 tentatives par 15 min par email
    const rateCheck = await checkRateLimit(base44, `login:${email}`, 5, 900000);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    // Validation email
    if (!validateEmail(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (userType === 'vendeur') {
      // Connexion VENDEUR via CompteVendeur
      const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });

      if (comptes.length === 0) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      const compte = comptes[0];

      if (compte.statut === 'suspendu') {
        return Response.json({ error: 'Compte suspendu. Contactez le support.' }, { status: 403 });
      }

      if (compte.statut === 'en_attente_kyc') {
        return Response.json({ success: false, pendingApproval: true });
      }

      const passwordMatch = await bcrypt.compare(password, compte.mot_de_passe_hash || '');
      if (!passwordMatch) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      return Response.json({
        success: true,
        session: {
          type: 'vendeur',
          role: 'vendeur',
          email: compte.user_email,
          nom_complet: compte.nom_complet,
          compte_id: compte.id,
        }
      });

    } else if (userType === 'admin') {

       // PRIORITÉ 1: Vérifier si c'est un sous-admin
       const sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({
         $or: [{ email: email }, { username: email }]
       });

       if (sousAdmins.length > 0) {
         const sousAdmin = sousAdmins[0];

         if (sousAdmin.statut === 'suspendu') {
           return Response.json({ error: 'Compte suspendu.' }, { status: 403 });
         }

         const passwordMatch = await bcrypt.compare(password, sousAdmin.mot_de_passe_hash || '');
         if (!passwordMatch) {
           return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
         }

         await base44.asServiceRole.entities.JournalAudit.create({
           action: 'sous_admin_login',
           module: 'systeme',
           details: `Connexion sous-admin: ${sousAdmin.nom_complet}`,
           utilisateur: sousAdmin.email,
         }).catch(() => {});

         return Response.json({
           success: true,
           session: {
             type: 'sous_admin',
             role: 'sous_admin',
             email: sousAdmin.email,
             nom_complet: sousAdmin.nom_complet,
             nom_role: sousAdmin.nom_role,
             permissions: sousAdmin.permissions || [],
             sous_admin_id: sousAdmin.id,
           }
         });
       }

       // PRIORITÉ 2: Admin principal — recherche par email ou username
       let adminUsers = await base44.asServiceRole.entities.User.filter({ email: email });

       // Si pas trouvé par email et le format n'est pas un email, chercher par "username" dans les données
       if (adminUsers.length === 0 && !validateEmail(email)) {
         const allAdmins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
         adminUsers = allAdmins.filter(u => u.data?.username === email);
       }

       if (adminUsers.length === 0 || adminUsers[0].role !== 'admin') {
         return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
       }

      // Vérifier le hash bcrypt stocké en ConfigApp
      const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });
      if (configs.length === 0 || !configs[0].valeur) {
        return Response.json({ error: 'Mot de passe admin non configuré. Contactez le super-administrateur.' }, { status: 403 });
      }

      const adminPasswordMatch = await bcrypt.compare(password, configs[0].valeur);
      if (!adminPasswordMatch) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      const adminUser = adminUsers[0];

      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'admin_login',
        module: 'systeme',
        details: `Connexion admin principal: ${adminUser.full_name}`,
        utilisateur: adminUser.email,
      }).catch(() => {});

      return Response.json({
        success: true,
        session: {
          type: 'admin',
          role: 'admin',
          email: adminUser.email,
          full_name: adminUser.full_name,
        }
      });

    } else {
      return Response.json({ error: 'Invalid userType' }, { status: 400 });
    }

  } catch (error) {
    console.error('Login error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});