/**
 * Helper centralisé pour toutes les opérations admin via backend function.
 * Évite les appels directs aux entités base44 depuis le frontend (session non authentifiée).
 */
import { base44 } from "@/api/base44Client";

const invoke = async (action, payload = {}) => {
  const res = await base44.functions.invoke('adminActions', { action, payload });
  return res.data;
};

export const adminApi = {
  // Produit
  createProduit: (data) => invoke('createProduit', { data }),
  updateProduit: (produitId, data) => invoke('updateProduit', { produitId, data }),

  // Commande Vendeur
  updateCommandeVendeur: (commandeId, data) => invoke('updateCommandeVendeur', { commandeId, data }),

  // Compte Vendeur
  updateCompteVendeur: (compteId, data) => invoke('updateCompteVendeur', { compteId, data }),

  // Vendeur
  updateVendeur: (vendeurId, data) => invoke('updateVendeur', { vendeurId, data }),
  createVendeur: (data) => invoke('createVendeur', { data }),
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
  createPaiementCommission: (data) => invoke('createPaiementCommission', { data }),

  // Retours
  updateRetourProduit: (retourId, data) => invoke('updateRetourProduit', { retourId, data }),
  createRetourProduit: (data) => invoke('createRetourProduit', { data }),

  // Mouvement stock
  createMouvementStock: (data) => invoke('createMouvementStock', { data }),

  // Journal Audit
  createJournalAudit: (data) => invoke('createJournalAudit', { data }),

  // Config App
  updateConfigApp: (configId, data) => invoke('updateConfigApp', { configId, data }),
  createConfigApp: (data) => invoke('createConfigApp', { data }),
};