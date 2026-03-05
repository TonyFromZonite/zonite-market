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

    if (userType === 'vendeur') {
      // Validation email pour vendeur
      if (!validateEmail(email)) {
        return Response.json({ error: 'Invalid email format' }, { status: 400 });
      }
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

        // PRIORITÉ 1: Chercher tous les admins et sous-admins
        let allAdmins = [];
        let allSousAdmins = [];

        try {
          allAdmins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        } catch (_) {}

        try {
          allSousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({});
        } catch (_) {}

        // Chercher le sous-admin par email ou username
        let matchedSousAdmin = null;
        if (validateEmail(email)) {
          matchedSousAdmin = allSousAdmins.find(s => s.email === email);
        } else {
          matchedSousAdmin = allSousAdmins.find(s => s.username === email);
        }

        if (matchedSousAdmin) {
          if (matchedSousAdmin.statut === 'suspendu') {
            return Response.json({ error: 'Compte suspendu.' }, { status: 403 });
          }
          const passwordMatch = await bcrypt.compare(password, matchedSousAdmin.mot_de_passe_hash || '');
          if (!passwordMatch) {
            return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
          }
          await base44.asServiceRole.entities.JournalAudit.create({
            action: 'sous_admin_login',
            module: 'systeme',
            details: `Connexion sous-admin: ${matchedSousAdmin.nom_complet}`,
            utilisateur: matchedSousAdmin.email,
          }).catch(() => {});
          return Response.json({
            success: true,
            session: {
              type: 'sous_admin',
              role: 'sous_admin',
              email: matchedSousAdmin.email,
              nom_complet: matchedSousAdmin.nom_complet,
              nom_role: matchedSousAdmin.nom_role,
              permissions: matchedSousAdmin.permissions || [],
              sous_admin_id: matchedSousAdmin.id,
            }
          });
        }

        // Chercher l'admin principal par email ou username
        let matchedAdmin = null;
        if (validateEmail(email)) {
          matchedAdmin = allAdmins.find(u => u.email === email);
        } else {
          matchedAdmin = allAdmins.find(u => u.data?.username === email);
        }

        if (!matchedAdmin) {
          return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
        }

        // Vérifier le mot de passe via ConfigApp
        let adminPasswordMatch = false;
        try {
          const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });
          console.log('[DEBUG] ConfigApp records found:', configs.length);
          if (configs.length > 0) {
            const configData = configs[0];
            console.log('[DEBUG] Config data structure:', Object.keys(configData));
            console.log('[DEBUG] Config.data:', configData.data);
            console.log('[DEBUG] Config.valeur:', configData.valeur);
            
            // Essayer d'accéder au hash via plusieurs chemins possibles
            let hashValue = configData.data?.valeur || configData.valeur || configData.data;
            console.log('[DEBUG] Extracted hash value type:', typeof hashValue);
            console.log('[DEBUG] Hash value (first 30 chars):', String(hashValue).substring(0, 30));
            
            if (hashValue) {
              console.log('[DEBUG] Attempting password comparison with password:', password);
              adminPasswordMatch = await bcrypt.compare(password, String(hashValue));
              console.log('[DEBUG] Password match result:', adminPasswordMatch);
            }
          }
        } catch (e) {
          console.log('[DEBUG] ConfigApp error:', e.message, e.stack);
        }

        if (!adminPasswordMatch) {
          return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
        }

        await base44.asServiceRole.entities.JournalAudit.create({
          action: 'admin_login',
          module: 'systeme',
          details: `Connexion admin principal: ${matchedAdmin.full_name}`,
          utilisateur: matchedAdmin.email,
        }).catch(() => {});

        return Response.json({
          success: true,
          session: {
            type: 'admin',
            role: 'admin',
            email: matchedAdmin.email,
            full_name: matchedAdmin.full_name,
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