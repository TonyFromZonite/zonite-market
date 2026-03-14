import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin ou sous_admin
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { seller_id, statut, notes } = body;

    if (!seller_id || !statut) {
      return Response.json({ error: 'seller_id et statut requis' }, { status: 400 });
    }

    // Récupérer le vendeur
    const seller = await base44.asServiceRole.entities.Seller.get(seller_id);
    if (!seller) {
      return Response.json({ error: 'Vendeur non trouvé' }, { status: 404 });
    }

    if (statut === 'valide') {
      // Valider le KYC
      await base44.asServiceRole.entities.Seller.update(seller_id, {
        statut_kyc: 'valide',
        statut: 'actif',
      });

      // Journal d'audit
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'KYC validé',
        module: 'vendeur',
        details: `KYC validé pour ${seller.nom_complet}`,
        utilisateur: user.email,
        entite_id: seller_id,
      }).catch(() => {});

      // Notification
      await base44.asServiceRole.entities.Notification.create({
        destinataire_email: seller.email,
        destinataire_role: 'vendeur',
        type: 'kyc_valide',
        titre: '✅ KYC Validé !',
        message: 'Félicitations ! Votre dossier KYC a été approuvé. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
        lien: '/EspaceVendeur',
        priorite: 'importante',
      }).catch(() => {});

      // Email avec identifiants
      try {
        await base44.integrations.Core.SendEmail({
          to: seller.email,
          subject: '✅ Votre KYC a été validé - Bienvenue chez ZONITE !',
          body: `Bonjour ${seller.nom_complet},\n\nFélicitations ! Votre dossier KYC a été approuvé avec succès. 🎉\n\nVotre compte est maintenant entièrement activé. Vous pouvez vous connecter et commencer à vendre dès maintenant.\n\nBon courage et bonne vente !\n\nL'équipe ZONITE`
        });
      } catch (e) {
        console.error('Email send failed:', e.message);
      }

      return Response.json({ success: true, message: 'KYC validé avec succès' });
    } else if (statut === 'rejete') {
      // Rejeter le KYC
      await base44.asServiceRole.entities.Seller.update(seller_id, {
        statut_kyc: 'rejete',
        statut: 'suspendu',
        notes_admin: notes || '',
      });

      // Journal d'audit
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'KYC rejeté',
        module: 'vendeur',
        details: `KYC rejeté pour ${seller.nom_complet}. Motif: ${notes || 'Non spécifié'}`,
        utilisateur: user.email,
        entite_id: seller_id,
      }).catch(() => {});

      // Notification
      await base44.asServiceRole.entities.Notification.create({
        destinataire_email: seller.email,
        destinataire_role: 'vendeur',
        type: 'kyc_rejete',
        titre: '❌ KYC Rejeté',
        message: `Votre dossier KYC a été rejeté. Motif: ${notes || 'Veuillez contacter le support pour plus de détails.'}`,
        lien: '/ProfilVendeur',
        priorite: 'urgente',
      }).catch(() => {});

      return Response.json({ success: true, message: 'KYC rejeté avec succès' });
    }

    return Response.json({ error: 'Statut invalide' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});