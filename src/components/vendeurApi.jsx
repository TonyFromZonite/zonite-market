/**
 * Helper centralisé pour toutes les opérations vendeur via backend function.
 * Passe automatiquement vendeur_email depuis la session custom (sessionStorage).
 */
import { base44 } from "@/api/base44Client";
import { getVendeurSession } from "@/components/useSessionGuard";

const invoke = async (action, payload = {}) => {
  const session = getVendeurSession();
  const vendeur_email = session?.email || null;

  if (!vendeur_email) {
    throw new Error('Session vendeur introuvable. Veuillez vous reconnecter.');
  }

  const res = await base44.functions.invoke('vendeurActions', { action, vendeur_email, payload });
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
  debloquerCatalogue: (compteId) => invoke('debloquerCatalogue', { compteId }),
};