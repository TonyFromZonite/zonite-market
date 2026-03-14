import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await req.json();
    const vente = await base44.asServiceRole.entities.Vente.create(data);
    
    // Envoyer notification de nouvelle vente (async, ne pas bloquer)
    if (data.vendeur_email) {
      base44.functions.invoke('notifierNouvelleVente', {
        vente_id: vente.id,
        vendeur_email: data.vendeur_email,
        vendeur_nom: data.vendeur_nom,
        produit_nom: data.produit_nom,
        montant_total: data.montant_total,
        commission_vendeur: data.commission_vendeur,
      }).catch(err => console.error('Erreur notification vente:', err));
    }
    
    return Response.json({ success: true, vente });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});