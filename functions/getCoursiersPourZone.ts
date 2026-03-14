import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Récupère les coursiers disponibles pour une ville/zone donnée
 * avec leurs tarifs
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ville, zone_nom } = await req.json();

    if (!ville) {
      return Response.json({ error: 'Ville requise' }, { status: 400 });
    }

    // Récupérer tous les coursiers actifs
    const coursiers = await base44.asServiceRole.entities.Coursier.filter({
      statut: 'actif'
    });

    // Filtrer les coursiers qui desservent cette ville/zone
    const coursiersDisponibles = coursiers.filter(coursier => {
      if (!coursier.zones_couvertes || coursier.zones_couvertes.length === 0) {
        return false;
      }

      return coursier.zones_couvertes.some(zc => {
        // Vérifier si la ville est dans les villes de cette zone
        const villeCouverte = zc.villes && zc.villes.includes(ville);
        
        // Si un nom de zone est spécifié, vérifier également
        const zoneCouverte = !zone_nom || zc.zone_nom === zone_nom;
        
        return villeCouverte && zoneCouverte;
      });
    });

    // Formater les résultats avec tarifs
    const resultat = coursiersDisponibles.map(coursier => {
      const zoneCourante = coursier.zones_couvertes.find(zc => {
        const villeOk = zc.villes && zc.villes.includes(ville);
        const zoneOk = !zone_nom || zc.zone_nom === zone_nom;
        return villeOk && zoneOk;
      });

      return {
        coursier_id: coursier.id,
        nom: coursier.nom,
        telephone: coursier.telephone,
        type: coursier.type,
        vehicule: coursier.vehicule,
        note_moyenne: coursier.note_moyenne || 0,
        zone_id: zoneCourante.zone_id,
        zone_nom: zoneCourante.zone_nom,
        ville: ville,
        prix_standard: zoneCourante.prix_standard || 0,
        prix_express: zoneCourante.prix_express || 0,
        delai_standard: zoneCourante.delai_standard || '',
        delai_express: zoneCourante.delai_express || ''
      };
    });

    return Response.json({
      success: true,
      ville,
      zone_nom: zone_nom || null,
      coursiers_disponibles: resultat.length,
      coursiers: resultat
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});