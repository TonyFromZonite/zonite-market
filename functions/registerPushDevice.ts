/**
 * Backend function - Enregistrer token push (Capacitor)
 * Appelé au démarrage de l'app
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pushToken, platform } = await req.json();

    if (!pushToken) {
      return Response.json({ error: 'Missing pushToken' }, { status: 400 });
    }

    // Sauvegarder le token (optionnel - pour suivi avancé)
    // Vous pouvez stocker dans une entité PushDevices si vous la créez

    console.log(`Push device registered: ${platform} - ${user.email}`);

    return Response.json({
      success: true,
      message: 'Device registered for push notifications',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});