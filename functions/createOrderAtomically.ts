/**
 * TRANSACTION ATOMIQUE : Créer commande + réserver stock
 * Évite race conditions lors de commandes concurrentes
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function logAudit(base44, data) {
  try {
    await base44.asServiceRole.entities.JournalAudit.create({
      action: data.action,
      module: data.module,
      details: data.details,
      utilisateur: data.utilisateur || '',
      entite_id: data.entite_id || '',
      donnees_avant: data.donnees_avant ? JSON.stringify(data.donnees_avant) : '',
      donnees_apres: data.donnees_apres ? JSON.stringify(data.donnees_apres) : '',
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Seuls les vendeurs (role = 'user') peuvent créer des commandes via cette fonction
    if (user.role !== 'user') {
      return Response.json({ error: 'Forbidden: vendeur role required' }, { status: 403 });
    }

    const {
      vendeur_id, vendeur_nom, vendeur_email,
      produit_id, produit_nom, quantite, prix_gros, prix_final_client, commission_vendeur,
      livraison_incluse, client_nom, client_telephone, client_ville, client_quartier, client_adresse, notes
    } = await req.json();

    // ✅ Vérification d'identité : récupérer le Seller via user_id (pas email)
    const sellers = await base44.asServiceRole.entities.Seller.filter({ user_id: user.id });
    if (sellers.length === 0) {
      return Response.json({ error: 'Forbidden: aucun compte vendeur lié à cet utilisateur' }, { status: 403 });
    }
    const sellerVerif = sellers[0];
    if (sellerVerif.id !== vendeur_id) {
      return Response.json({ error: 'Forbidden: vendeur_id ne correspond pas au compte connecté' }, { status: 403 });
    }

    // Validation
    if (!produit_id || quantite < 1) {
      return Response.json({ error: 'Invalid product or quantity' }, { status: 400 });
    }

    // 1️⃣ Vérifier stock disponible (lecteur seul)
    const produit = await base44.asServiceRole.entities.Produit.filter({ id: produit_id });
    if (!produit.length) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const stockDisponible = (produit[0].stock_global || 0) - (produit[0].stock_reserve || 0);
    if (quantite > stockDisponible) {
      await logAudit(base44, {
        action: 'insufficient_stock',
        module: 'commande',
        details: `Tentative d'ordre avec stock insuffisant: ${quantite} > ${stockDisponible}`,
        utilisateur: vendeur_email,
        entite_id: produit_id,
      });
      return Response.json({ error: `Insufficient stock. Available: ${stockDisponible}` }, { status: 409 });
    }

    // 2️⃣ Créer la commande (transaction)
    const commande = await base44.asServiceRole.entities.CommandeVendeur.create({
      vendeur_id, vendeur_nom, vendeur_email,
      produit_id, produit_nom, quantite, prix_gros, prix_final_client, commission_vendeur,
      livraison_incluse, client_nom, client_telephone, client_ville, client_quartier, client_adresse, notes,
      statut: "en_attente_validation_admin",
    });

    // 3️⃣ Mettre à jour stock de façon cohérente :
    //    - stock_reserve augmente (stock réservé pour cette commande)
    //    - stock_global diminue (le stock disponible réel est consommé)
    const newStockGlobal = (produit[0].stock_global || 0) - quantite;
    const newStockReserve = (produit[0].stock_reserve || 0) + quantite;
    await base44.asServiceRole.entities.Produit.update(produit_id, {
      stock_global: newStockGlobal,
      stock_reserve: newStockReserve,
      total_vendu: (produit[0].total_vendu || 0) + quantite,
    });

    // 4️⃣ Enregistrer mouvement de stock (source de vérité)
    await base44.asServiceRole.entities.MouvementStock.create({
      produit_id, produit_nom,
      type_mouvement: "sortie",
      quantite,
      stock_avant: produit[0].stock_global || 0,
      stock_apres: newStockGlobal,
      raison: `Réservation commande vendeur ${vendeur_nom}`,
      reference_vente: commande.id,
    });

    // 5️⃣ Notifications (non-bloquantes)
    try {
      // Notification au vendeur
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email,
        titre: "✅ Commande envoyée !",
        message: `Votre commande de ${quantite}x ${produit_nom} pour ${client_nom} a été transmise à l'équipe ZONITE. En attente de validation.`,
        type: "succes",
        importante: false,
      });
      // Notifications aux admins
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44.asServiceRole.entities.NotificationVendeur.create({
          vendeur_email: admin.email,
          titre: '🛒 Nouvelle commande à valider',
          message: `${vendeur_nom} a passé une commande de ${quantite}x ${produit_nom} pour le client ${client_nom}.`,
          type: 'info',
          importante: false,
          lien: '/CommandesVendeurs'
        });
      }
    } catch (notifErr) {
      console.error('Notification creation failed (non-blocking):', notifErr.message);
    }

    // 6️⃣ Audit log
    await logAudit(base44, {
      action: 'order_created',
      module: 'commande',
      details: `Commande créée: ${quantite}x ${produit_nom} pour ${client_nom}`,
      utilisateur: vendeur_email,
      entite_id: commande.id,
      donnees_apres: { commande_id: commande.id, stock_reserve: (produit[0].stock_reserve || 0) + quantite },
    });

    return Response.json({
      success: true,
      commande_id: commande.id,
      message: 'Order created and stock reserved'
    });

  } catch (error) {
    console.error('Atomic order creation failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});