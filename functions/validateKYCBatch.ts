import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Validation batch des KYC en attente
 * À exécuter via automation programmée (quotidienne)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Seul un admin peut déclencher
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Récupérer les KYC en attente depuis plus de 48h
    const kycsEnAttente = await base44.asServiceRole.entities.CompteVendeur.filter({
      statut_kyc: 'en_attente'
    });

    const maintenant = new Date();
    const rejetsAuto = [];

    for (const kyc of kycsEnAttente) {
      const createdDate = new Date(kyc.created_date);
      const heuresEcoulees = (maintenant - createdDate) / (1000 * 60 * 60);

      // Auto-rejet après 72h sans action
      if (heuresEcoulees > 72) {
        await base44.asServiceRole.entities.CompteVendeur.update(kyc.id, {
          statut_kyc: 'rejete',
          notes_admin: 'Rejeté automatiquement après 72h d\'attente sans action',
        });

        // Notifier le vendeur
        await base44.asServiceRole.entities.NotificationVendeur.create({
          vendeur_email: kyc.user_email,
          titre: 'Dossier KYC rejeté',
          message: 'Votre dossier KYC a expiré. Veuillez vous réinscrire.',
          type: 'alerte',
          importante: true,
        });

        // Email
        await base44.integrations.Core.SendEmail({
          to: kyc.user_email,
          subject: 'Dossier KYC expiré',
          body: `Bonjour ${kyc.nom_complet},\n\nVotre dossier KYC a expiré après 72h d'attente sans validation.\nVeuillez vous réinscrire sur la plateforme.\n\nCordialement,\nL'équipe ZONITE`,
        });

        rejetsAuto.push(kyc.id);
      }
    }

    // Audit
    if (rejetsAuto.length > 0) {
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'kyc_auto_reject',
        module: 'systeme',
        details: `${rejetsAuto.length} KYC rejetés automatiquement après 72h`,
        utilisateur: 'SYSTEM',
        donnees_apres: JSON.stringify({ rejected_ids: rejetsAuto }),
      });
    }

    return Response.json({ success: true, rejected: rejetsAuto.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});