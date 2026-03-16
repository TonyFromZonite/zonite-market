import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getVendeurSession } from "@/components/useSessionGuard";
import { createPageUrl } from "@/utils";

/**
 * Hook centralisé pour récupérer le compte vendeur et calculer les droits d'accès.
 */
export function useSellerAccess() {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const charger = async () => {
      const session = getVendeurSession();
      if (!session) {
        window.location.href = createPageUrl("Connexion");
        return;
      }
      // Si session contient déjà les données vendeur
      if (session.id && session.nom_complet) {
        setSeller(session);
        setLoading(false);
        return;
      }
      const sellers = await base44.entities.Seller.filter({ email: session.email });
      if (sellers.length > 0) {
        setSeller(sellers[0]);
      } else {
        window.location.href = createPageUrl("Connexion");
      }
      setLoading(false);
    };
    charger();
  }, []);

  const status = seller?.seller_status;

  return {
    seller,
    loading,

    // Peut accéder à l'espace vendeur (dashboard, profil, notifs, support)
    canAccessEspace: ["kyc_pending", "active_seller"].includes(status),

    // Peut faire des actions (commandes, commissions, paiements)
    canDoActions: status === "active_seller",

    // Peut voir le catalogue
    canSeeCatalogue: seller?.catalogue_debloque === true,

    // KYC en attente de validation
    isKycPending: status === "kyc_pending",

    // KYC requis (pas encore soumis)
    isKycRequired: status === "kyc_required",

    // Email non vérifié
    isPendingVerification: status === "pending_verification",

    // Compte pleinement actif
    isFullyActive: status === "active_seller",
  };
}