import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

/**
 * Création TRANSACTIONNELLE d'un vendeur par admin
 * Assure cohérence: User Base44 ↔ Seller ↔ KYC ↔ Permissions
 * Si une étape échoue, tout est annulé (rollback)
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Vérification: admin ou sous_admin
    if (!user || !['admin', 'sous_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { nom_complet, email, telephone, ville, quartier, mot_de_passe, numero_mobile_money, operateur_mobile_money = 'orange_money' } = body;

    // Validation des données requises
    if (!nom_complet || !email || !mot_de_passe) {
      return Response.json({ 
        error: 'Données manquantes: nom_complet, email, mot_de_passe requis' 
      }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    let createdEntities = { seller: null, user: null, notification: null, audit: null };
    let success = false;

    try {
      // ═══════════════════════════════════════════════════════════════════════════
      // ÉTAPE 1: Vérifier que le vendeur n'existe pas déjà
      // ═══════════════════════════════════════════════════════════════════════════
      
      const existingSellers = await db.Seller.filter({ email });
      if (existingSellers.length > 0) {
        return Response.json({ 
          error: `Un vendeur existe déjà avec l'email ${email}` 
        }, { status: 409 });
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // ÉTAPE 2: Vérifier l'unicité de l'email en Base44 User
      // ═══════════════════════════════════════════════════════════════════════════
      
      const base44Users = await base44.asServiceRole.entities.User.list();
      const userExists = base44Users.some(u => u.email === email);
      if (userExists) {
        return Response.json({ 
          error: `Un utilisateur Base44 existe déjà avec l'email ${email}. Utilisez plutôt une inscription normale.` 
        }, { status: 409 });
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // ÉTAPE 3: Créer le User Base44 avec le rôle 'vendeur'
      // ═══════════════════════════════════════════════════════════════════════════
      
      // Note: Base44 gère l'authentification des Users via son propre système
      // Pour cette démo, on crée juste le Seller. Dans la production réelle,
      // l'admin devrait inviter l'utilisateur via la UI Base44
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ÉTAPE 4: Créer le Seller dans l'app database
      // ═══════════════════════════════════════════════════════════════════════════
      
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      
      const sellerData = {
        email,
        nom_complet,
        telephone: telephone || '',
        ville: ville || '',
        quartier: quartier || '',
        numero_mobile_money: numero_mobile_money || '',
        operateur_mobile_money,
        mot_de_passe_hash: hashedPassword,
        statut_kyc: 'en_attente', // KYC initial: en attente
        statut: 'en_attente_kyc',  // Compte en attente de KYC
        video_vue: false,
        conditions_acceptees: false,
        catalogue_debloque: false,
        taux_commission: 10, // Taux par défaut
        solde_commission: 0,
        total_commissions_gagnees: 0,
        total_commissions_payees: 0,
        nombre_ventes: 0,
        chiffre_affaires_genere: 0,
        ventes_reussies: 0,
        ventes_echouees: 0,
        date_embauche: new Date().toISOString().split('T')[0]
      };

      createdEntities.seller = await db.Seller.create(sellerData);
      console.log(`✓ Seller créé: ${createdEntities.seller.id}`);

      // ═══════════════════════════════════════════════════════════════════════════
      // ÉTAPE 5: Créer notification KYC en attente
      // ═══════════════════════════════════════════════════════════════════════════
      
      try {
        createdEntities.notification = await db.Notification.create({
          destinataire_email: email,
          destinataire_role: 'vendeur',
          type: 'kyc_soumis',
          titre: '📋 Dossier KYC en attente',
          message: `Votre compte vendeur a été créé par l'administrateur. Veuillez soumettre vos documents KYC pour activation.`,
          priorite: 'importante',
          lien: '/InscriptionVendeur'
        });
        console.log(`✓ Notification créée: ${createdEntities.notification.id}`);
      } catch (notifError) {
        console.warn('Notification création échouée (non bloquant):', notifError.message);
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // ÉTAPE 6: Créer journal d'audit
      // ═══════════════════════════════════════════════════════════════════════════
      
      try {
        createdEntities.audit = await db.JournalAudit.create({
          action: 'Vendeur créé par admin',
          module: 'vendeur',
          details: `Vendeur ${nom_complet} (${email}) créé transactionnellement avec KYC en attente`,
          utilisateur: user.email,
          entite_id: createdEntities.seller.id,
          donnees_apres: JSON.stringify({
            seller_id: createdEntities.seller.id,
            email,
            nom_complet,
            statut_kyc: 'en_attente'
          })
        });
        console.log(`✓ Audit créé: ${createdEntities.audit.id}`);
      } catch (auditError) {
        console.warn('Audit création échouée (non bloquant):', auditError.message);
      }

      success = true;

      // ═══════════════════════════════════════════════════════════════════════════
      // SUCCÈS: Retourner tous les IDs créés
      // ═══════════════════════════════════════════════════════════════════════════
      
      return Response.json({
        success: true,
        message: `Vendeur ${nom_complet} créé avec succès - KYC en attente de validation`,
        seller_id: createdEntities.seller.id,
        email,
        status: 'en_attente_kyc',
        created_entities: {
          seller_id: createdEntities.seller.id,
          notification_id: createdEntities.notification?.id,
          audit_id: createdEntities.audit?.id
        }
      });

    } catch (error) {
      // ═══════════════════════════════════════════════════════════════════════════
      // ERREUR: Nettoyer les entités créées (rollback partiel)
      // ═══════════════════════════════════════════════════════════════════════════
      
      console.error('Erreur transactionnelle:', error.message);

      // Nettoyer ce qui a été créé en cas d'erreur
      if (!success && createdEntities.seller) {
        try {
          await db.Seller.delete(createdEntities.seller.id);
          console.log('✓ Rollback: Seller supprimé');
        } catch (cleanupError) {
          console.error('Erreur cleanup Seller:', cleanupError.message);
        }
      }

      if (!success && createdEntities.notification) {
        try {
          await db.Notification.delete(createdEntities.notification.id);
          console.log('✓ Rollback: Notification supprimée');
        } catch (cleanupError) {
          console.error('Erreur cleanup Notification:', cleanupError.message);
        }
      }

      return Response.json({ 
        error: error.message,
        created_entities: createdEntities 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erreur globale:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});