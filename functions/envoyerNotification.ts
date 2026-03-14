import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { 
      destinataire_email, 
      destinataire_role,
      type, 
      titre, 
      message, 
      reference_id, 
      reference_type,
      lien,
      priorite = 'normale'
    } = await req.json();

    if (!destinataire_email || !type || !titre || !message) {
      return Response.json({ 
        error: 'Paramètres manquants: destinataire_email, type, titre, message sont requis' 
      }, { status: 400 });
    }

    // Créer la notification dans la base de données
    const notification = await base44.asServiceRole.entities.Notification.create({
      destinataire_email,
      destinataire_role: destinataire_role || 'vendeur',
      type,
      titre,
      message,
      reference_id: reference_id || null,
      reference_type: reference_type || null,
      lien: lien || null,
      priorite,
      lue: false,
    });

    // Optionnel: Envoyer notification push si l'utilisateur a une subscription active
    try {
      const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
        user_email: destinataire_email,
        actif: true,
      });

      if (subscriptions.length > 0) {
        // TODO: Implémenter l'envoi de push notifications via web-push
        // Pour l'instant, on log juste
        console.log(`Push notification à envoyer à ${destinataire_email}:`, titre);
      }
    } catch (pushError) {
      console.error('Erreur push notification:', pushError);
      // Ne pas bloquer si l'envoi push échoue
    }

    return Response.json({ 
      success: true, 
      notification_id: notification.id 
    });

  } catch (error) {
    console.error('Erreur envoi notification:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});