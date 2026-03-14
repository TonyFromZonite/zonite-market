import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Vérifier que c'est un événement de suppression Seller
    if (event.type !== 'delete' || event.entity_name !== 'Seller') {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    const sellerEmail = data?.email;
    if (!sellerEmail) {
      console.warn('Aucun email fourni dans les données du vendeur supprimé');
      return Response.json({ success: true, message: 'Pas d\'email pour suppression en cascade' });
    }

    // Supprimer l'utilisateur Base44 correspondant
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: sellerEmail });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.delete(users[0].id);
        console.log(`✅ Utilisateur Base44 supprimé pour ${sellerEmail}`);
      }
    } catch (userError) {
      console.warn(`⚠️ Impossible de supprimer l'utilisateur Base44: ${userError.message}`);
    }

    // Supprimer les notifications liées
    try {
      const notifications = await base44.asServiceRole.entities.NotificationVendeur.filter({ vendeur_email: sellerEmail });
      for (const notif of notifications) {
        await base44.asServiceRole.entities.NotificationVendeur.delete(notif.id);
      }
      if (notifications.length > 0) {
        console.log(`✅ ${notifications.length} notification(s) supprimée(s)`);
      }
    } catch (notifError) {
      console.warn(`⚠️ Erreur suppression notifications: ${notifError.message}`);
    }

    return Response.json({ success: true, message: 'Suppression en cascade effectuée' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});