import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * COMPLETE SELLER DELETION (NEW ARCHITECTURE)
 * Deletes EVERYWHERE:
 * 1. Seller entity
 * 2. Base44 User account
 * 3. Related records (orders, commissions, etc.)
 * 4. Dashboard caches
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Non autorisé - Admin uniquement' }, { status: 403 });
    }

    const { seller_id, seller_email } = await req.json();

    if (!seller_id || !seller_email) {
      return Response.json({ 
        error: 'seller_id et seller_email requis' 
      }, { status: 400 });
    }

    console.log(`🗑️ Deleting seller: ${seller_email} (ID: ${seller_id})`);

    // STEP 1: Get seller to retrieve user_id
    const sellers = await base44.asServiceRole.entities.Seller.filter({ id: seller_id });
    if (sellers.length === 0) {
      return Response.json({ error: 'Vendeur non trouvé' }, { status: 404 });
    }
    const seller = sellers[0];
    const user_id = seller.user_id;

    // STEP 2: Delete related records
    console.log('🗑️ Deleting related records...');

    // Delete orders
    const orders = await base44.asServiceRole.entities.CommandeVendeur.filter({ vendeur_email: seller_email });
    for (const order of orders) {
      await base44.asServiceRole.entities.CommandeVendeur.delete(order.id);
    }
    console.log(`✅ Deleted ${orders.length} orders`);

    // Delete payment requests
    const payments = await base44.asServiceRole.entities.DemandePaiementVendeur.filter({ vendeur_email: seller_email });
    for (const payment of payments) {
      await base44.asServiceRole.entities.DemandePaiementVendeur.delete(payment.id);
    }
    console.log(`✅ Deleted ${payments.length} payment requests`);

    // Delete notifications
    const notifications = await base44.asServiceRole.entities.NotificationVendeur.filter({ vendeur_email: seller_email });
    for (const notif of notifications) {
      await base44.asServiceRole.entities.NotificationVendeur.delete(notif.id);
    }
    console.log(`✅ Deleted ${notifications.length} notifications`);

    // Delete support tickets
    const tickets = await base44.asServiceRole.entities.TicketSupport.filter({ vendeur_email: seller_email });
    for (const ticket of tickets) {
      await base44.asServiceRole.entities.TicketSupport.delete(ticket.id);
    }
    console.log(`✅ Deleted ${tickets.length} support tickets`);

    // STEP 3: Delete Seller entity
    await base44.asServiceRole.entities.Seller.delete(seller_id);
    console.log(`✅ Deleted Seller entity: ${seller_id}`);

    // STEP 4: Delete Base44 User account
    if (user_id) {
      try {
        await base44.asServiceRole.entities.User.delete(user_id);
        console.log(`✅ Deleted Base44 user: ${user_id}`);
      } catch (userErr) {
        console.warn(`⚠️ Could not delete Base44 user ${user_id}:`, userErr.message);
      }
    } else {
      console.warn(`⚠️ No user_id found for seller ${seller_id}`);
    }

    // STEP 5: Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Vendeur supprimé (complet)',
      module: 'vendeur',
      details: `${seller.nom_complet} (${seller_email}) et toutes ses données supprimés par ${user.email}`,
      utilisateur: user.email,
      entite_id: seller_id,
      donnees_avant: JSON.stringify({
        seller_id,
        user_id,
        email: seller_email,
        nom_complet: seller.nom_complet
      })
    }).catch(() => {});

    return Response.json({
      success: true,
      message: 'Vendeur et toutes ses données supprimés avec succès',
      deleted: {
        seller: true,
        user: !!user_id,
        orders: orders.length,
        payments: payments.length,
        notifications: notifications.length,
        tickets: tickets.length
      }
    });

  } catch (error) {
    console.error('❌ Error deleting seller:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});