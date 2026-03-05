import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { token, email, nouveau_mot_de_passe } = await req.json();

    if (!token || !email || !nouveau_mot_de_passe) {
      return Response.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    if (nouveau_mot_de_passe.length < 6) {
      return Response.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 });
    }

    const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: email });
    if (comptes.length === 0) {
      return Response.json({ error: 'Token invalide ou expiré.' }, { status: 400 });
    }

    const compte = comptes[0];

    // Vérifier expiration du token
    if (!compte.reset_token_expiry || new Date(compte.reset_token_expiry) < new Date()) {
      return Response.json({ error: 'Ce lien a expiré. Refaites une demande de réinitialisation.' }, { status: 400 });
    }

    // Vérifier le token (compare token brut avec le hash stocké)
    const tokenValid = await bcrypt.compare(token, compte.reset_token || '');
    if (!tokenValid) {
      return Response.json({ error: 'Token invalide ou expiré.' }, { status: 400 });
    }

    // ✅ Hacher le nouveau mot de passe côté serveur
    const nouveauHash = await bcrypt.hash(nouveau_mot_de_passe, 10);

    // ✅ Mettre à jour + invalider le token (usage unique)
    await base44.asServiceRole.entities.CompteVendeur.update(compte.id, {
      mot_de_passe_hash: nouveauHash,
      reset_token: null,
      reset_token_expiry: null,
    });

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'password_reset_confirmed',
      module: 'systeme',
      details: `Mot de passe réinitialisé via lien pour: ${email}`,
      utilisateur: email,
      entite_id: compte.id,
    }).catch(() => {});

    return Response.json({ success: true });

  } catch (error) {
    console.error('Confirm reset error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});