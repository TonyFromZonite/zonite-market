import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { seller_id, seller_nom, seller_email } = await req.json();

    if (!seller_id || !seller_nom) {
      return Response.json({ 
        error: 'seller_id et seller_nom requis' 
      }, { status: 400 });
    }

    // Récupérer tous les admins
    const admins = await base44.asServiceRole.entities.User.filter({
      role: 'admin'
    });

    // Créer une notification pour chaque admin
    const notifications = await Promise.all(
      admins.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          destinataire_email: admin.email,
          destinataire_role: 'admin',
          type: 'kyc_soumis',
          titre: 'Nouveau dossier KYC à valider',
          message: `${seller_nom} a soumis son dossier KYC pour validation.`,
          reference_id: seller_id,
          reference_type: 'Seller',
          lien: '/GestionKYC',
          priorite: 'importante',
          lue: false,
        })
      )
    );

    return Response.json({ 
      success: true, 
      notifications_envoyees: notifications.length 
    });

  } catch (error) {
    console.error('Erreur notification KYC:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});