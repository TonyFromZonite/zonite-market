import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    // Authentification admin obligatoire
    const user = await base44.auth.me();
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const { compte_id, statut, notes } = await req.json();

     if (!compte_id || !statut || !['valide', 'rejete'].includes(statut)) {
       return Response.json({ error: 'Paramètres invalides.' }, { status: 400 });
     }

     // Chercher dans Vendeur (nouveau système)
     let vendeur = null;
     vendeur = await base44.asServiceRole.entities.Vendeur.filter({ id: compte_id });

     if (vendeur.length === 0) {
       // Fallback sur CompteVendeur (ancien système)
       const comptes = await base44.asServiceRole.entities.CompteVendeur.filter({ id: compte_id });
       if (comptes.length === 0) {
         return Response.json({ error: 'Compte introuvable.' }, { status: 404 });
       }
       vendeur = comptes; // Pour compatibilité
     }

     const compte = vendeur[0];

    if (statut === 'valide') {
      // Vérifier si c'est un Vendeur ou CompteVendeur
      const isVendeur = vendeur[0].email !== undefined && vendeur[0].nom_complet !== undefined;

      if (isVendeur) {
        // Mise à jour du Vendeur
        await base44.asServiceRole.entities.Vendeur.update(compte_id, {
          statut: 'actif',
        });
      } else {
        // Mise à jour du CompteVendeur (ancien système)
        await base44.asServiceRole.entities.CompteVendeur.update(compte_id, {
          statut_kyc: 'valide',
          statut: 'actif',
          notes_admin: notes || '',
        });

        // Créer dans Vendeur si pas encore existant
        const vendeurs = await base44.asServiceRole.entities.Vendeur.filter({ email: compte.user_email });
        if (vendeurs.length === 0) {
          await base44.asServiceRole.entities.Vendeur.create({
            nom_complet: compte.nom_complet,
            email: compte.user_email,
            telephone: compte.telephone,
            statut: 'actif',
            date_embauche: new Date().toISOString().split("T")[0],
            solde_commission: 0,
            total_commissions_gagnees: 0,
            total_commissions_payees: 0,
            nombre_ventes: 0,
            chiffre_affaires_genere: 0,
          });
        }
      }

      // Log audit
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'kyc_valide',
        module: 'vendeur',
        details: `KYC validé pour ${compte.nom_complet} (${compte.user_email}) par ${user.email}`,
        utilisateur: user.email,
        entite_id: compte_id,
      }).catch(() => {});

      // Notification in-app
      const vendorEmail = compte.user_email || compte.email;
      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: vendorEmail,
        titre: "✅ Compte validé !",
        message: `Félicitations ${compte.nom_complet} ! Votre compte a été validé. Vous pouvez maintenant vous connecter avec vos identifiants.`,
        type: 'succes',
      }).catch(() => {});

      // Email de confirmation
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: vendorEmail,
          subject: '🎉 Bienvenue chez ZONITE – Votre compte est validé',
          body: `Bonjour ${compte.nom_complet},\n\nFélicitations ! Votre compte vendeur ZONITE a été validé. 🚀\n\nVous pouvez maintenant vous connecter avec vos identifiants (email et mot de passe que vous avez créés lors de l'inscription).\n\nBon courage et bonne vente !\n\nL'équipe ZONITE`
        });
      } catch (e) {
        console.error('Email send failed:', e.message);
      }

      return Response.json({ success: true, statut: 'valide' });

    } else {
      // Rejet
      await base44.asServiceRole.entities.CompteVendeur.update(compte_id, {
        statut_kyc: 'rejete',
        statut: 'suspendu',
        notes_admin: notes || '',
      });

      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'kyc_rejete',
        module: 'vendeur',
        details: `KYC rejeté pour ${compte.nom_complet} (${compte.user_email}) par ${user.email}. Motif: ${notes || 'non spécifié'}`,
        utilisateur: user.email,
        entite_id: compte_id,
      }).catch(() => {});

      await base44.asServiceRole.entities.NotificationVendeur.create({
        vendeur_email: compte.user_email,
        titre: "Dossier rejeté",
        message: `Votre dossier a été rejeté. ${notes || "Contactez notre équipe pour plus d'informations."}`,
        type: 'alerte',
      }).catch(() => {});

      return Response.json({ success: true, statut: 'rejete' });
    }

  } catch (error) {
    console.error('KYC validation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});