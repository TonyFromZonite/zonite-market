import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

// Fonction d'urgence pour réinitialiser le mot de passe admin
// Accessible uniquement si l'utilisateur Base44 est admin
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin Base44 required' }, { status: 403 });
    }

    const { newPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Chercher si le hash existe déjà
    const configs = await base44.asServiceRole.entities.ConfigApp.filter({ cle: 'admin_password_hash' });

    if (configs.length > 0) {
      await base44.asServiceRole.entities.ConfigApp.update(configs[0].id, { valeur: hashedPassword });
    } else {
      await base44.asServiceRole.entities.ConfigApp.create({
        cle: 'admin_password_hash',
        valeur: hashedPassword,
        description: "Mot de passe chiffré de l'administrateur principal",
      });
    }

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'admin_password_reset_emergency',
      module: 'systeme',
      details: `Réinitialisation d'urgence du mot de passe admin par ${user.email}`,
      utilisateur: user.email,
    }).catch(() => {});

    return Response.json({ success: true, message: 'Mot de passe admin réinitialisé avec succès.' });
  } catch (error) {
    console.error('Reset admin password error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});