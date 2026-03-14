import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { autoFix = true } = await req.json();
    
    const rapport = {
      timestamp: new Date().toISOString(),
      auditedBy: user.email,
      sections: [],
      summary: {
        totalEntities: 0,
        totalIssues: 0,
        criticalIssues: 0,
        correctedIssues: 0,
        manualInterventionNeeded: 0
      },
      status: 'perfect'
    };

    // =========================================
    // 1. AUDIT USERS & SELLERS
    // =========================================
    
    const sectionUsers = {
      name: 'Users & Sellers',
      totalRecords: 0,
      issues: [],
      corrections: []
    };

    const base44Users = await base44.asServiceRole.entities.User.list();
    const sellers = await base44.asServiceRole.entities.Seller.list();
    sectionUsers.totalRecords = base44Users.length + sellers.length;

    // Détecter comptes fantômes
    for (const b44User of base44Users) {
      if (b44User.role === 'vendeur') {
        const seller = sellers.find(s => s.email === b44User.email);
        if (!seller) {
          sectionUsers.issues.push({
            severity: 'critical',
            type: 'ghost_account',
            entity: 'User',
            id: b44User.id,
            email: b44User.email,
            message: `User Base44 sans Seller app: ${b44User.email}`
          });

          if (autoFix) {
            const hasData = b44User.full_name && b44User.full_name.trim().length > 0;
            if (hasData) {
              const newSeller = await base44.asServiceRole.entities.Seller.create({
                email: b44User.email,
                nom_complet: b44User.full_name,
                telephone: '',
                mot_de_passe_hash: '',
                statut_kyc: 'en_attente',
                statut: 'en_attente_kyc',
                taux_commission: 10,
                solde_commission: 0,
                total_commissions_gagnees: 0,
                total_commissions_payees: 0,
                nombre_ventes: 0,
                chiffre_affaires_genere: 0,
                ventes_reussies: 0,
                ventes_echouees: 0
              });
              sectionUsers.corrections.push(`Seller créé: ${b44User.email}`);
            } else {
              await base44.asServiceRole.entities.User.delete(b44User.id);
              sectionUsers.corrections.push(`User fantôme supprimé: ${b44User.email}`);
            }
          }
        }
      }
    }

    // Détecter comptes orphelins
    for (const seller of sellers) {
      const b44User = base44Users.find(u => u.email === seller.email);
      if (!b44User) {
        sectionUsers.issues.push({
          severity: 'critical',
          type: 'orphan_account',
          entity: 'Seller',
          id: seller.id,
          email: seller.email,
          message: `Seller app sans User Base44: ${seller.email}`
        });

        if (autoFix) {
          await base44.asServiceRole.entities.Seller.delete(seller.id);
          sectionUsers.corrections.push(`Seller orphelin supprimé: ${seller.email}`);
        }
      }

      // Vérifier cohérence KYC
      if (seller.statut_kyc === 'valide' && seller.statut !== 'actif') {
        sectionUsers.issues.push({
          severity: 'high',
          type: 'kyc_status_mismatch',
          entity: 'Seller',
          id: seller.id,
          email: seller.email,
          message: `KYC validé mais compte non actif: ${seller.email}`
        });

        if (autoFix) {
          await base44.asServiceRole.entities.Seller.update(seller.id, { statut: 'actif' });
          sectionUsers.corrections.push(`Statut activé: ${seller.email}`);
        }
      }

      if (!seller.statut_kyc) {
        sectionUsers.issues.push({
          severity: 'medium',
          type: 'missing_kyc_status',
          entity: 'Seller',
          id: seller.id,
          email: seller.email,
          message: `Statut KYC manquant: ${seller.email}`
        });

        if (autoFix) {
          await base44.asServiceRole.entities.Seller.update(seller.id, { statut_kyc: 'en_attente' });
          sectionUsers.corrections.push(`KYC défini à "en_attente": ${seller.email}`);
        }
      }
    }

    rapport.sections.push(sectionUsers);

    // =========================================
    // 2. AUDIT PRODUCTS & STOCK
    // =========================================
    
    const sectionProduits = {
      name: 'Produits & Stock',
      totalRecords: 0,
      issues: [],
      corrections: []
    };

    const produits = await base44.asServiceRole.entities.Produit.list();
    sectionProduits.totalRecords = produits.length;

    for (const produit of produits) {
      // Vérifier prix cohérents
      if (produit.prix_vente && produit.prix_gros && produit.prix_vente < produit.prix_gros) {
        sectionProduits.issues.push({
          severity: 'high',
          type: 'price_inconsistency',
          entity: 'Produit',
          id: produit.id,
          nom: produit.nom,
          message: `Prix vente < Prix gros: ${produit.nom} (${produit.prix_vente} < ${produit.prix_gros})`
        });
      }

      if (produit.prix_gros && produit.prix_achat && produit.prix_gros < produit.prix_achat) {
        sectionProduits.issues.push({
          severity: 'critical',
          type: 'negative_margin',
          entity: 'Produit',
          id: produit.id,
          nom: produit.nom,
          message: `Prix gros < Prix achat: ${produit.nom} - MARGE NÉGATIVE`
        });
      }

      // Vérifier stock global vs somme stocks locaux
      if (produit.stocks_par_localisation && Array.isArray(produit.stocks_par_localisation)) {
        let sommeStocksLocaux = 0;
        for (const loc of produit.stocks_par_localisation) {
          if (loc.variations_stock && Array.isArray(loc.variations_stock)) {
            for (const variation of loc.variations_stock) {
              sommeStocksLocaux += variation.quantite || 0;
            }
          }
        }

        if (produit.stock_global !== sommeStocksLocaux) {
          sectionProduits.issues.push({
            severity: 'medium',
            type: 'stock_mismatch',
            entity: 'Produit',
            id: produit.id,
            nom: produit.nom,
            message: `Stock global (${produit.stock_global}) ≠ Somme stocks locaux (${sommeStocksLocaux})`
          });

          if (autoFix) {
            await base44.asServiceRole.entities.Produit.update(produit.id, { stock_global: sommeStocksLocaux });
            sectionProduits.corrections.push(`Stock global recalculé: ${produit.nom} (${sommeStocksLocaux})`);
          }
        }
      }

      // Vérifier variations définies vs variations en stock
      if (produit.variations_definition && produit.stocks_par_localisation) {
        const variationsDefinies = produit.variations_definition.map(v => v.attributs);
        
        for (const loc of produit.stocks_par_localisation) {
          if (loc.variations_stock) {
            for (const varStock of loc.variations_stock) {
              if (!variationsDefinies.includes(varStock.attributs)) {
                sectionProduits.issues.push({
                  severity: 'medium',
                  type: 'undefined_variation',
                  entity: 'Produit',
                  id: produit.id,
                  nom: produit.nom,
                  message: `Variation en stock non définie: ${produit.nom} - ${varStock.attributs}`
                });
              }
            }
          }
        }
      }

      // Vérifier statut vs stock
      if (produit.statut === 'actif' && produit.stock_global === 0) {
        sectionProduits.issues.push({
          severity: 'low',
          type: 'active_no_stock',
          entity: 'Produit',
          id: produit.id,
          nom: produit.nom,
          message: `Produit actif mais stock = 0: ${produit.nom}`
        });

        if (autoFix) {
          await base44.asServiceRole.entities.Produit.update(produit.id, { statut: 'rupture' });
          sectionProduits.corrections.push(`Statut mis à "rupture": ${produit.nom}`);
        }
      }
    }

    rapport.sections.push(sectionProduits);

    // =========================================
    // 3. AUDIT VENTES & COMMISSIONS
    // =========================================
    
    const sectionVentes = {
      name: 'Ventes & Commissions',
      totalRecords: 0,
      issues: [],
      corrections: []
    };

    const ventes = await base44.asServiceRole.entities.Vente.list();
    const commandesVendeur = await base44.asServiceRole.entities.CommandeVendeur.list();
    sectionVentes.totalRecords = ventes.length + commandesVendeur.length;

    for (const vente of ventes) {
      // Vérifier liens vendeur
      const vendeur = sellers.find(s => s.id === vente.vendeur_id);
      if (!vendeur) {
        sectionVentes.issues.push({
          severity: 'critical',
          type: 'orphan_sale',
          entity: 'Vente',
          id: vente.id,
          message: `Vente sans vendeur existant: ${vente.id}`
        });
      }

      // Vérifier liens produit
      const produit = produits.find(p => p.id === vente.produit_id);
      if (!produit) {
        sectionVentes.issues.push({
          severity: 'critical',
          type: 'orphan_sale_product',
          entity: 'Vente',
          id: vente.id,
          message: `Vente sans produit existant: ${vente.id}`
        });
      }

      // Vérifier calcul commission
      if (vendeur && vente.prix_unitaire && vente.quantite) {
        const commissionAttendue = ((vente.prix_unitaire - (vente.prix_achat_unitaire || 0)) * vente.quantite * (vente.taux_commission || vendeur.taux_commission || 0)) / 100;
        const diff = Math.abs((vente.commission_vendeur || 0) - commissionAttendue);
        
        if (diff > 0.01) {
          sectionVentes.issues.push({
            severity: 'high',
            type: 'commission_mismatch',
            entity: 'Vente',
            id: vente.id,
            message: `Commission incorrecte: ${vente.id} (${vente.commission_vendeur} vs ${commissionAttendue.toFixed(2)})`
          });

          if (autoFix) {
            await base44.asServiceRole.entities.Vente.update(vente.id, { commission_vendeur: commissionAttendue });
            sectionVentes.corrections.push(`Commission corrigée: Vente ${vente.id}`);
          }
        }
      }
    }

    for (const cmd of commandesVendeur) {
      // Vérifier liens vendeur
      const vendeur = sellers.find(s => s.id === cmd.vendeur_id);
      if (!vendeur) {
        sectionVentes.issues.push({
          severity: 'critical',
          type: 'orphan_order',
          entity: 'CommandeVendeur',
          id: cmd.id,
          message: `Commande sans vendeur existant: ${cmd.id}`
        });
      }

      // Vérifier liens produit
      const produit = produits.find(p => p.id === cmd.produit_id);
      if (!produit) {
        sectionVentes.issues.push({
          severity: 'critical',
          type: 'orphan_order_product',
          entity: 'CommandeVendeur',
          id: cmd.id,
          message: `Commande sans produit existant: ${cmd.id}`
        });
      }

      // Vérifier cohérence statut
      if (cmd.statut === 'livree' && !cmd.commission_vendeur) {
        sectionVentes.issues.push({
          severity: 'high',
          type: 'delivered_no_commission',
          entity: 'CommandeVendeur',
          id: cmd.id,
          message: `Commande livrée sans commission calculée: ${cmd.id}`
        });
      }
    }

    rapport.sections.push(sectionVentes);

    // =========================================
    // 4. AUDIT LIVRAISONS & ZONES
    // =========================================
    
    const sectionLivraisons = {
      name: 'Livraisons & Zones',
      totalRecords: 0,
      issues: [],
      corrections: []
    };

    const zones = await base44.asServiceRole.entities.Zone.list();
    const coursiers = await base44.asServiceRole.entities.Coursier.list();
    const livraisons = await base44.asServiceRole.entities.Livraison.list();
    sectionLivraisons.totalRecords = zones.length + coursiers.length + livraisons.length;

    // Vérifier zones actives sans livraison
    for (const zone of zones) {
      if (zone.statut === 'actif') {
        const hasCoursier = coursiers.some(c => 
          c.zones_couvertes && c.zones_couvertes.some(z => z.zone_id === zone.id)
        );
        
        if (!hasCoursier) {
          sectionLivraisons.issues.push({
            severity: 'medium',
            type: 'zone_no_courier',
            entity: 'Zone',
            id: zone.id,
            nom: zone.nom,
            message: `Zone active sans coursier assigné: ${zone.nom}`
          });
        }
      }
    }

    // Vérifier coursiers avec zones inexistantes
    for (const coursier of coursiers) {
      if (coursier.zones_couvertes) {
        for (const zoneCouv of coursier.zones_couvertes) {
          const zoneExiste = zones.find(z => z.id === zoneCouv.zone_id);
          if (!zoneExiste) {
            sectionLivraisons.issues.push({
              severity: 'high',
              type: 'courier_invalid_zone',
              entity: 'Coursier',
              id: coursier.id,
              nom: coursier.nom,
              message: `Coursier avec zone inexistante: ${coursier.nom} - Zone ID: ${zoneCouv.zone_id}`
            });
          }
        }
      }
    }

    rapport.sections.push(sectionLivraisons);

    // =========================================
    // 5. AUDIT NOTIFICATIONS
    // =========================================
    
    const sectionNotifications = {
      name: 'Notifications',
      totalRecords: 0,
      issues: [],
      corrections: []
    };

    const notifications = await base44.asServiceRole.entities.Notification.list();
    const pushSubscriptions = await base44.asServiceRole.entities.PushSubscription.list();
    sectionNotifications.totalRecords = notifications.length + pushSubscriptions.length;

    // Vérifier notifications orphelines
    for (const notif of notifications) {
      const destinataireExiste = base44Users.some(u => u.email === notif.destinataire_email) ||
                                  sellers.some(s => s.email === notif.destinataire_email);
      
      if (!destinataireExiste) {
        sectionNotifications.issues.push({
          severity: 'low',
          type: 'orphan_notification',
          entity: 'Notification',
          id: notif.id,
          message: `Notification pour utilisateur inexistant: ${notif.destinataire_email}`
        });

        if (autoFix) {
          await base44.asServiceRole.entities.Notification.delete(notif.id);
          sectionNotifications.corrections.push(`Notification orpheline supprimée: ${notif.id}`);
        }
      }
    }

    // Vérifier subscriptions push orphelines
    for (const sub of pushSubscriptions) {
      const userExiste = base44Users.some(u => u.email === sub.user_email);
      
      if (!userExiste) {
        sectionNotifications.issues.push({
          severity: 'low',
          type: 'orphan_push_subscription',
          entity: 'PushSubscription',
          id: sub.id,
          message: `Push subscription pour utilisateur inexistant: ${sub.user_email}`
        });

        if (autoFix) {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
          sectionNotifications.corrections.push(`Push subscription orpheline supprimée: ${sub.id}`);
        }
      }
    }

    rapport.sections.push(sectionNotifications);

    // =========================================
    // 6. CALCULER RÉSUMÉ
    // =========================================
    
    for (const section of rapport.sections) {
      rapport.summary.totalEntities += section.totalRecords;
      
      const realIssues = section.issues.filter(issue => issue.severity !== 'info');
      rapport.summary.totalIssues += realIssues.length;
      
      rapport.summary.criticalIssues += section.issues.filter(i => i.severity === 'critical').length;
      rapport.summary.correctedIssues += section.corrections.length;
    }

    rapport.summary.manualInterventionNeeded = rapport.summary.totalIssues - rapport.summary.correctedIssues;

    rapport.status = rapport.summary.totalIssues === 0 ? 'perfect' : 
                     rapport.summary.manualInterventionNeeded === 0 ? 'corrected' : 
                     'needs_attention';

    // =========================================
    // 7. CRÉER AUDIT LOG
    // =========================================
    
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Audit complet système',
      module: 'systeme',
      details: `Entités: ${rapport.summary.totalEntities}, Problèmes: ${rapport.summary.totalIssues}, Corrigés: ${rapport.summary.correctedIssues}, Critiques: ${rapport.summary.criticalIssues}`,
      utilisateur: user.email,
      donnees_apres: JSON.stringify(rapport.summary)
    });

    return Response.json({ 
      success: true, 
      report: rapport,
      production_ready: rapport.status === 'perfect' || rapport.status === 'corrected'
    });

  } catch (error) {
    console.error('Erreur audit complet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});