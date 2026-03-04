import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { checkRateLimit, validateEmail, logAudit } from './auditLoggingMiddleware.js';

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
      await logAudit(base44, {
        action: 'login_rate_limit_exceeded',
        module: 'systeme',
        details: `Trop de tentatives de connexion pour ${email}`,
        utilisateur: email,
      });
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

      // Vérifier statut
      if (compte.statut === 'suspendu') {
        return Response.json({ error: 'Compte suspendu. Contactez le support.' }, { status: 403 });
      }

      if (compte.statut === 'en_attente_kyc') {
        return Response.json({ success: false, pendingApproval: true });
      }

      // Vérifier password
      const passwordMatch = await bcrypt.compare(password, compte.mot_de_passe_hash || '');
      if (!passwordMatch) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      // Session vendeur
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
      // Connexion ADMIN/SOUS-ADMIN
      
      // PRIORITÉ 1: Vérifier si c'est un sous-admin avec un mot de passe personnalisé
      // Ne pas faire d'authentification Base44 avant - risque de confusion
      const sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ 
        $or: [
          { email: email },
          { username: email }
        ]
      });

      if (sousAdmins.length > 0) {
        const sousAdmin = sousAdmins[0];

        if (sousAdmin.statut === 'suspendu') {
          return Response.json({ error: 'Compte suspendu.' }, { status: 403 });
        }

        // Vérifier le mot de passe du sous-admin (AVANT toute auth Base44)
        const passwordMatch = await bcrypt.compare(password, sousAdmin.mot_de_passe_hash || '');
        if (!passwordMatch) {
          return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
        }

        // Audit log
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

      // PRIORITÉ 2: Si pas de sous-admin trouvé, vérifier l'admin principal via Base44
      // À ce stade, on sait que ce n'est pas un sous-admin, donc on peut faire l'auth Base44
      const user = await base44.auth.me().catch(() => null);
      
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Identifiants incorrects ou accès admin refusé.' }, { status: 401 });
      }

      // Audit log
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'admin_login',
        module: 'systeme',
        details: `Connexion admin principal: ${user.full_name}`,
        utilisateur: user.email,
      }).catch(() => {});

      return Response.json({
        success: true,
        session: {
          type: 'admin',
          role: 'admin',
          email: user.email,
          full_name: user.full_name,
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