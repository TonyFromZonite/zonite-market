/**
 * Helper centralisé pour toutes les opérations vendeur via backend function.
 * Évite les appels directs aux entités base44 depuis le frontend côté vendeur.
 */
import { base44 } from "@/api/base44Client";

const invoke = async (action, payload = {}) => {
  const res = await base44.functions.invoke('vendeurActions', { action, payload });
  return res.data;
};

export const vendeurApi = {
  // Demande de paiement (crée la demande + notification auto)
  createDemandePaiement: (data) => invoke('createDemandePaiement', { data }),

  // Notifications
  marquerNotificationLue: (notifId) => invoke('marquerNotificationLue', { notifId }),
  toutMarquerLu: (notifIds) => invoke('toutMarquerLu', { notifIds }),

  // Tickets Support
  createTicketSupport: (data) => invoke('createTicketSupport', { data }),
  marquerTicketLu: (ticketId) => invoke('marquerTicketLu', { ticketId }),

  // Formation / déblocage catalogue
  debloquerCatalogue: (compteId, vendeur_email) => invoke('debloquerCatalogue', { compteId, vendeur_email }),
};