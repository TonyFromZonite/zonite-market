import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Suppression forcée d'une entité (bypasse les soft deletes)
 * Utilise le service role pour garantir la suppression effective
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Non autorisé - Admin uniquement' }, { status: 403 });
    }

    const { entity_name, entity_id } = await req.json();

    if (!entity_name || !entity_id) {
      return Response.json({ 
        error: 'Paramètres requis: entity_name, entity_id' 
      }, { status: 400 });
    }

    // Entités autorisées pour suppression forcée
    const entitesAutorisees = [
      'Produit',
      'Zone',
      'Coursier',
      'Categorie',
      'Livraison',
      'Vente',
      'CommandeVendeur',
      'CommandeVente'
    ];

    if (!entitesAutorisees.includes(entity_name)) {
      return Response.json({ 
        error: `Entité ${entity_name} non autorisée pour suppression forcée` 
      }, { status: 400 });
    }

    // Vérifier que l'entité existe
    const entity = await base44.asServiceRole.entities[entity_name].get(entity_id);
    
    if (!entity) {
      return Response.json({ 
        error: 'Entité non trouvée' 
      }, { status: 404 });
    }

    // Suppression forcée via service role
    await base44.asServiceRole.entities[entity_name].delete(entity_id);

    // Créer un log d'audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'force_delete',
      module: entity_name.toLowerCase(),
      details: `Suppression forcée de ${entity_name} ID: ${entity_id}`,
      utilisateur: user.email,
      entite_id: entity_id,
      donnees_avant: JSON.stringify(entity)
    });

    return Response.json({
      success: true,
      message: `${entity_name} supprimé définitivement`,
      entity_name,
      entity_id,
      deleted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur suppression forcée:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});