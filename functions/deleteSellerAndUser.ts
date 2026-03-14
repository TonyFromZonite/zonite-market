import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { seller_id } = await req.json();

    if (!seller_id) {
      return Response.json({ error: 'Missing seller_id' }, { status: 400 });
    }

    // 1. Récupérer les données du vendeur avant suppression
    const sellers = await base44.asServiceRole.entities.Seller.filter({ id: seller_id });
    if (sellers.length === 0) {
      return Response.json({ error: 'Vendeur non trouvé' }, { status: 404 });
    }

    const sellerEmail = sellers[0].email;

    // 2. Supprimer toutes les données liées au vendeur
    try {
      // Supprimer les notifications
      const notifs = await base44.asServiceRole.entities.NotificationVendeur.filter({ vendeur_email: sellerEmail });
      for (const notif of notifs) {
        await base44.asServiceRole.entities.NotificationVendeur.delete(notif.id);
      }
    } catch (e) {
      console.warn('Erreur suppression notifications:', e.message);
    }

    try {
      // Supprimer les commandes
      const commandes = await base44.asServiceRole.entities.CommandeVendeur.filter({ vendeur_email: sellerEmail });
      for (const cmd of commandes) {
        await base44.asServiceRole.entities.CommandeVendeur.delete(cmd.id);
      }
    } catch (e) {
      console.warn('Erreur suppression commandes:', e.message);
    }

    // 3. Supprimer l'entité Seller
    await base44.asServiceRole.entities.Seller.delete(seller_id);
    console.log(`✅ Seller supprimé: ${sellerEmail}`);

    // 4. Supprimer l'utilisateur Base44
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: sellerEmail });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.delete(users[0].id);
        console.log(`✅ Utilisateur Base44 supprimé: ${sellerEmail}`);
      }
    } catch (userError) {
      console.warn('⚠️ Erreur suppression utilisateur Base44:', userError.message);
    }

    return Response.json({ 
      success: true, 
      message: `Vendeur ${sellerEmail} et toutes ses données supprimés avec succès` 
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});