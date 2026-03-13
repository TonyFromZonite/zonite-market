import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

/**
 * Changement de mot de passe pour les vendeurs utilisant le système d'auth custom.
 * Authentifie le vendeur par email + ancien mot de passe (pas de session Base44 requise).
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { email, oldPassword, newPassword } = await req.json();

    if (!email || !oldPassword || !newPassword) {
      return Response.json({ error: 'Tous les champs sont requis.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return Response.json({ error: 'Le mot de passe doit contenir au moins une majuscule.' }, { status: 400 });
    }
    if (!/[0-9]/.test(newPassword)) {
      return Response.json({ error: 'Le mot de passe doit contenir au moins un chiffre.' }, { status: 400 });
    }

    const sellers = await base44.asServiceRole.entities.Seller.filter({ email });
    if (sellers.length === 0) {
      return Response.json({ error: 'Compte introuvable.' }, { status: 404 });
    }

    const seller = sellers[0];

    // Vérifier l'ancien mot de passe
    const passwordMatch = await bcrypt.compare(oldPassword, seller.mot_de_passe_hash || '');
    if (!passwordMatch) {
      return Response.json({ error: 'Ancien mot de passe incorrect.' }, { status: 401 });
    }

    // Hacher et sauvegarder le nouveau mot de passe
    const newHash = await bcrypt.hash(newPassword, 10);
    await base44.asServiceRole.entities.Seller.update(seller.id, {
      mot_de_passe_hash: newHash,
    });

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'password_change',
      module: 'vendeur',
      details: `Vendeur ${seller.nom_complet} a changé son mot de passe`,
      utilisateur: email,
      entite_id: seller.id,
    }).catch(() => {});

    return Response.json({ success: true });

  } catch (error) {
    console.error('Change password error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});