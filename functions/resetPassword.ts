import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

// ✅ Rate limiting persistant via JournalAudit (remplace la Map en mémoire)
async function checkRateLimit(base44, email) {
  const windowStart = new Date(Date.now() - 3600000).toISOString(); // 1 heure
  try {
    const recentAttempts = await base44.asServiceRole.entities.JournalAudit.filter({
      action: `rate_limit_check:reset:${email}`,
      created_date: { $gte: windowStart }
    });
    if (recentAttempts.length >= 3) return false;
    await base44.asServiceRole.entities.JournalAudit.create({
      action: `rate_limit_check:reset:${email}`,
      module: 'systeme',
      details: `Reset password attempt for ${email}`,
      utilisateur: email,
    }).catch(() => {});
    return true;
  } catch (_) {
    return true;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // ✅ Rate limiting persistant
    if (!await checkRateLimit(base44, email)) {
      return Response.json({ error: 'Too many reset attempts. Try again later.' }, { status: 429 });
    }

    const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });

    // Ne pas divulguer si le compte existe
    if (comptes.length === 0) {
      return Response.json({ success: true, message: 'If the email exists, a reset link will be sent' });
    }

    const compte = comptes[0];

    if (compte.statut === 'en_attente_kyc' || compte.statut_kyc === 'en_attente') {
      return Response.json({
        error: 'Account validation pending. Contact support.'
      }, { status: 403 });
    }

    // ✅ Générer un token aléatoire sécurisé (pas un mot de passe en clair)
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const tokenHash = await bcrypt.hash(token, 8);
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // expire dans 30 min

    // Stocker le token haché + expiration
    await base44.asServiceRole.entities.CompteVendeur.update(compte.id, {
      reset_token: tokenHash,
      reset_token_expiry: expiry,
    });

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'password_reset_request',
      module: 'systeme',
      details: `Password reset link generated for vendor account`,
      utilisateur: email,
      entite_id: compte.id,
    }).catch(() => {});

    // ✅ Envoyer un LIEN sécurisé, pas un mot de passe en clair
    const appUrl = Deno.env.get("APP_URL") || "https://app.base44.com/app/69a304769dda004762ee3a57"; // Configurer APP_URL dans les variables d'environnement
    const resetLink = `${appUrl}/ResetPassword?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: '🔐 Réinitialiser votre mot de passe ZONITE',
        body: `Bonjour ${compte.nom_complet},\n\nVous avez demandé la réinitialisation de votre mot de passe ZONITE.\n\nCliquez sur ce lien pour choisir un nouveau mot de passe :\n\n${resetLink}\n\n⚠️ Ce lien expire dans 30 minutes et ne peut être utilisé qu'une seule fois.\n\nSi vous n'avez pas fait cette demande, ignorez cet email.\n\nCordialement,\nL'équipe ZONITE`
      });
    } catch (emailErr) {
      console.error('Reset email send failed:', emailErr.message);
    }

    return Response.json({ success: true, message: 'If the email exists, a reset link will be sent' });

  } catch (error) {
    console.error('Reset password error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});