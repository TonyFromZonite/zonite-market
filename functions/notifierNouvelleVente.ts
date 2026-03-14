import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      vente_id, 
      vendeur_email, 
      vendeur_nom,
      produit_nom, 
      montant_total,
      commission_vendeur 
    } = await req.json();

    if (!vente_id || !vendeur_email || !produit_nom) {
      return Response.json({ 
        error: 'Paramètres manquants' 
      }, { status: 400 });
    }

    // Notification pour le vendeur
    await base44.asServiceRole.entities.Notification.create({
      destinataire_email: vendeur_email,
      destinataire_role: 'vendeur',
      type: 'nouvelle_vente',
      titre: 'Vente enregistrée avec succès',
      message: `Votre vente de ${produit_nom} pour ${montant_total} FCFA a été enregistrée. Commission: ${commission_vendeur} FCFA.`,
      reference_id: vente_id,
      reference_type: 'Vente',
      lien: '/MesCommandesVendeur',
      priorite: 'normale',
      lue: false,
    });

    // Notification pour les admins
    const admins = await base44.asServiceRole.entities.User.filter({
      role: 'admin'
    });

    await Promise.all(
      admins.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          destinataire_email: admin.email,
          destinataire_role: 'admin',
          type: 'nouvelle_vente',
          titre: 'Nouvelle vente enregistrée',
          message: `${vendeur_nom || vendeur_email} a enregistré une vente de ${produit_nom} (${montant_total} FCFA).`,
          reference_id: vente_id,
          reference_type: 'Vente',
          lien: '/Commandes',
          priorite: 'normale',
          lue: false,
        })
      )
    );

    return Response.json({ success: true });

  } catch (error) {
    console.error('Erreur notification vente:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});