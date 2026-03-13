import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Méthode non autorisée' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { vendeur_email, nouveau_hash } = await req.json();

    if (!vendeur_email || !nouveau_hash) {
      return Response.json({ error: 'Email et hash requis' }, { status: 400 });
    }

    // Récupérer le compte vendeur
    const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ user_email: vendeur_email });
    
    if (!comptes || comptes.length === 0) {
      return Response.json({ error: 'Compte vendeur introuvable' }, { status: 404 });
    }

    // Mettre à jour avec les permissions service role
    const result = await base44.asServiceRole.entities.CompteVendeur.update(
      comptes[0].id,
      { mot_de_passe_hash: nouveau_hash }
    );

    return Response.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès',
      result 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});