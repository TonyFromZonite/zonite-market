import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password, userType } = await req.json();

    if (!email || !password || !userType) {
      return Response.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }

    // ══════════════════════════════════════════
    // CONNEXION VENDEUR
    // ══════════════════════════════════════════
    if (userType === 'vendeur') {
      if (!validateEmail(email)) {
        return Response.json({ error: 'Format email invalide.' }, { status: 400 });
      }

      // Vérifier en tant qu'utilisateur Base44 authentifié
      try {
        const user = await base44.auth.me();
        if (!user || user.email !== email) {
          return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
        }
      } catch {
        return Response.json({ error: 'Authentification échouée.' }, { status: 401 });
      }

      // Chercher le vendeur dans l'entité Vendeur (vendeurs créés par admin)
      const vendeurs = await base44.asServiceRole.entities.Vendeur.filter({ email });

      if (vendeurs.length === 0) {
        return Response.json({ error: 'Compte vendeur introuvable.' }, { status: 401 });
      }

      const vendeur = vendeurs[0];

      if (vendeur.statut_kyc === 'en_attente') {
        return Response.json({ success: false, pendingApproval: true });
      }

      if (vendeur.statut_kyc === 'rejete') {
        return Response.json({ error: 'Votre dossier KYC a été rejeté.' }, { status: 403 });
      }

      if (vendeur.statut === 'inactif') {
        return Response.json({ error: 'Compte inactif. Contactez le support.' }, { status: 403 });
      }

      return Response.json({
        success: true,
        session: {
          type: 'vendeur',
          role: 'vendeur',
          email: vendeur.email,
          nom_complet: vendeur.nom_complet,
          compte_id: vendeur.id,
        }
      });

    // ══════════════════════════════════════════
    // CONNEXION ADMIN / SOUS-ADMIN
    // ══════════════════════════════════════════
    } else if (userType === 'admin') {

      const isEmail = validateEmail(email);

      // 1. Chercher parmi les sous-admins (par email ou username)
      let sousAdmins = [];
      if (isEmail) {
        sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ email: email });
      } else {
        sousAdmins = await base44.asServiceRole.entities.SousAdmin.filter({ username: email });
      }

      if (sousAdmins.length > 0) {
        const sousAdmin = sousAdmins[0];

        if (sousAdmin.statut === 'suspendu') {
          return Response.json({ error: 'Compte suspendu. Contactez l\'administrateur.' }, { status: 403 });
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

      // 2. Chercher parmi les admins principaux (par email ou username "admin")
      const isAdminUsername = email.trim().toLowerCase() === 'admin';
      if (!isEmail && !isAdminUsername) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const matchedAdmin = isAdminUsername ? admins[0] : admins.find(u => u.email === email);

      if (!matchedAdmin) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      // Vérifier le mot de passe via ConfigApp
      const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });

      if (configs.length === 0) {
        return Response.json({ error: 'Mot de passe admin non configuré. Contactez le support.' }, { status: 500 });
      }

      const hashValue = configs[0].data?.valeur || configs[0].valeur;

      if (!hashValue) {
        return Response.json({ error: 'Configuration invalide. Contactez le support.' }, { status: 500 });
      }

      const adminPasswordMatch = await bcrypt.compare(password, String(hashValue));

      if (!adminPasswordMatch) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'admin_login',
        module: 'systeme',
        details: `Connexion admin principal: ${matchedAdmin.full_name || matchedAdmin.email}`,
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
      return Response.json({ error: 'Type de connexion invalide.' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 });
  }
});