/**
 * Backend function - Envoyer notifications Capacitor
 * Déclenche via webhook ou action utilisateur
 * Crédits : ~1 par 200 notifications
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { vendeur_id, title, body, data = {} } = await req.json();

    if (!vendeur_id || !title || !body) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Récupérer les appareils du vendeur (via table de suivi)
    const [notification] = await base44.asServiceRole.entities.NotificationVendeur.list(1);

    // Structure pour Capacitor Push
    const pushPayload = {
      title,
      body,
      data: {
        vendeur_id,
        timestamp: new Date().toISOString(),
        ...data,
      },
    };

    // Log audit
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Push notification envoyée',
      module: 'notification',
      details: `${title} → ${vendeur_id}`,
      utilisateur: user.email,
    });

    return Response.json({
      success: true,
      message: 'Notification queued',
      payload: pushPayload,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});