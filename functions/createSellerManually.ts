import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { email, password, nom_complet, telephone } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Vérifier si le compte existe déjà
    const existing = await base44.asServiceRole.entities.Seller.filter({ email });
    if (existing.length > 0) {
      return Response.json({ error: 'Ce compte existe déjà' }, { status: 400 });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer le compte Seller
    const seller = await base44.asServiceRole.entities.Seller.create({
      email,
      mot_de_passe_hash: passwordHash,
      nom_complet: nom_complet || email.split('@')[0],
      telephone: telephone || '',
      statut_kyc: 'valide',
      statut: 'actif',
      email_verified: true,
    });

    return Response.json({ success: true, seller_id: seller.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});