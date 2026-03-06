/**
 * Helper centralisé pour toutes les opérations d'écriture vendeur via backend function.
 * Évite les appels directs aux entités base44 depuis le frontend.
 */
import { base44 } from "@/api/base44Client";

const invoke = async (action, payload = {}) => {
  const res = await base44.functions.invoke('vendeurActions', { action, payload });
  if (res.data?.error) {
    throw new Error(res.data.error);
  }
  return res.data;
};

export const vendeurApi = {
  // Demande de paiement (crée la demande + notification automatique)
  createDemandePaiement: (data) => invoke('createDemandePaiement', { data }),

  // Notifications
  marquerNotificationLue: (notifId) => invoke('marquerNotificationLue', { notifId }),
  marquerToutesNotificationsLues: () => invoke('marquerToutesNotificationsLues'),

  // Tickets support
  createTicketSupport: (data) => invoke('createTicketSupport', { data }),
  marquerTicketLu: (ticketId) => invoke('marquerTicketLu', { ticketId }),

  // Formation
  validerFormationEtDebloquerCatalogue: () => invoke('validerFormationEtDebloquerCatalogue'),
};