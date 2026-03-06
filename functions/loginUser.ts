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

      // 2. Chercher parmi les admins principaux (uniquement par email)
      if (!isEmail) {
        return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 });
      }

      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const matchedAdmin = admins.find(u => u.email === email);

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