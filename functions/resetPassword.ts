import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

function genererMdp(longueur = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: longueur }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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

    // Reset vendeur password
    const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
    if (comptes.length === 0) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    const compte = comptes[0];
    const nouveauMdp = genererMdp();
    const hashedPassword = await bcrypt.hash(nouveauMdp, 10);

    await base44.asServiceRole.entities.CompteVendeur.update(compte.id, { mot_de_passe_hash: hashedPassword });

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: '🔐 Votre nouveau mot de passe ZONITE',
      body: `Bonjour ${compte.nom_complet},\n\nVotre nouveau mot de passe temporaire est :\n\n👉 ${nouveauMdp}\n\nConnectez-vous sur l'application ZONITE et changez-le dans votre profil.\n\nCordialement,\nL'équipe ZONITE`
    });

    return Response.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});