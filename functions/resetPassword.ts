import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

function genererMdp(longueur = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: longueur }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Rate limiting simple (en mémoire)
const resetAttempts = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const attempts = resetAttempts.get(email) || [];
  
  // Supprimer les tentatives de plus d'1 heure
  const recentAttempts = attempts.filter(t => now - t < 3600000);
  
  // Max 3 tentatives par heure
  if (recentAttempts.length >= 3) {
    return false;
  }
  
  recentAttempts.push(now);
  resetAttempts.set(email, recentAttempts);
  return true;
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

    // Valider email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Vérifier rate limiting
    if (!checkRateLimit(email)) {
      return Response.json({ error: 'Too many reset attempts. Try again later.' }, { status: 429 });
    }

    // Vérifier que le compte existe (sans divulguer si l'email existe)
    const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
    if (comptes.length === 0) {
      // Ne pas divulguer si le compte existe ou non
      return Response.json({ success: true, message: 'If the email exists, a reset link will be sent' });
    }

    const compte = comptes[0];
    
    // Vérifier le statut KYC
    if (compte.statut === 'en_attente_kyc' || compte.statut_kyc === 'en_attente') {
      return Response.json({ 
        error: 'Account validation pending. Contact support.' 
      }, { status: 403 });
    }

    const nouveauMdp = genererMdp();
    const hashedPassword = await bcrypt.hash(nouveauMdp, 10);

    await base44.asServiceRole.entities.CompteVendeur.update(compte.id, { mot_de_passe_hash: hashedPassword });

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Password reset requested',
      module: 'systeme',
      details: `Password reset for ${email}`,
      utilisateur: email,
    });

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: '🔐 Votre nouveau mot de passe ZONITE',
      body: `Bonjour ${compte.nom_complet},\n\nVotre nouveau mot de passe temporaire est :\n\n👉 ${nouveauMdp}\n\nConnectez-vous sur l'application ZONITE et changez-le dans votre profil.\n\nPour votre sécurité, ce mot de passe expire dans 24h.\n\nCordialement,\nL'équipe ZONITE`
    });

    return Response.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});