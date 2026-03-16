/**
 * Helper centralisé pour toutes les opérations admin via backend function.
 * Évite les appels directs aux entités base44 depuis le frontend (session non authentifiée).
 */
import { base44 } from "@/api/base44Client";
import { getAdminSession, getSousAdminSession } from "@/components/useSessionGuard";

const invoke = async (action, payload = {}) => {
  const session = getAdminSession() || getSousAdminSession();
  const res = await base44.functions.invoke('adminActions', { action, payload, _session: session });
  return res.data;
};

export const adminApi = {
  // Produit
  createProduit: (data) => invoke('createProduit', { data }),
  updateProduit: (produitId, data) => invoke('updateProduit', { produitId, data }),
  deleteProduit: (produitId) => invoke('deleteProduit', { produitId }),

  // Commande Vendeur
  updateCommandeVendeur: (commandeId, data) => invoke('updateCommandeVendeur', { commandeId, data }),

  // Compte Vendeur
  updateCompteVendeur: (compteId, data) => invoke('updateCompteVendeur', { compteId, data }),

  // Vendeur
  listVendeurs: () => invoke('listVendeurs'),
  updateVendeur: (vendeurId, data) => invoke('updateVendeur', { vendeurId, data }),
  createVendeur: (data) => invoke('createVendeur', { data }),
  createVendeurInitial: (data) => invoke('createVendeurInitial', { data }),
  validateKycAndActivate: (payload) => invoke('validateKycAndActivate', payload),
  deleteVendeur: (vendeurId) => invoke('deleteVendeur', { vendeurId }),

  // Candidature
  updateCandidature: (candidatureId, data) => invoke('updateCandidature', { candidatureId, data }),

  // Vente (commandes admin)
  updateVente: (venteId, data) => invoke('updateVente', { venteId, data }),

  // Sous-Admin
  updateSousAdmin: (sousAdminId, data) => invoke('updateSousAdmin', { sousAdminId, data }),
  createSousAdmin: (data) => invoke('createSousAdmin', { data }),
  deleteSousAdmin: (sousAdminId) => invoke('deleteSousAdmin', { sousAdminId }),

  // Admin Permissions
  updateAdminPermissions: (permId, data) => invoke('updateAdminPermissions', { permId, data }),
  createAdminPermissions: (data) => invoke('createAdminPermissions', { data }),
  deleteAdminPermissions: (permId) => invoke('deleteAdminPermissions', { permId }),
  listAdminPermissions: () => invoke('listAdminPermissions'),

  // Ticket Support
  updateTicketSupport: (ticketId, data) => invoke('updateTicketSupport', { ticketId, data }),

  // FAQ
  updateFaqItem: (faqId, data) => invoke('updateFaqItem', { faqId, data }),
  createFaqItem: (data) => invoke('createFaqItem', { data }),
  deleteFaqItem: (faqId) => invoke('deleteFaqItem', { faqId }),

  // Notifications
  updateNotificationVendeur: (notifId, data) => invoke('updateNotificationVendeur', { notifId, data }),
  createNotificationVendeur: (data) => invoke('createNotificationVendeur', { data }),

  // Paiements
  updateDemandePaiement: (demandeId, data) => invoke('updateDemandePaiement', { demandeId, data }),
  marquerDemandePaye: (demandeId) => invoke('marquerDemandePaye', { demandeId }),
  createPaiementCommission: (data) => invoke('createPaiementCommission', { data }),

  // Retours
  updateRetourProduit: (retourId, data) => invoke('updateRetourProduit', { retourId, data }),
  createRetourProduit: (data) => invoke('createRetourProduit', { data }),

  // Mouvement stock
  createMouvementStock: (data) => invoke('createMouvementStock', { data }),

  // Journal Audit
  createJournalAudit: (data) => invoke('createJournalAudit', { data }),

  // Catégories
  createCategorie: (data) => invoke('createCategorie', { data }),
  updateCategorie: (categorieId, data) => invoke('updateCategorie', { categorieId, data }),
  deleteCategorie: (categorieId) => invoke('deleteCategorie', { categorieId }),

  // Config App
  updateConfigApp: (configId, data) => invoke('updateConfigApp', { configId, data }),
  createConfigApp: (data) => invoke('createConfigApp', { data }),

  // Livraison
  createLivraison: (data) => invoke('createLivraison', { data }),
  updateLivraison: (livraisonId, data) => invoke('updateLivraison', { livraisonId, data }),
  deleteLivraison: (livraisonId) => invoke('deleteLivraison', { livraisonId }),
};