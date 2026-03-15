import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getVendeurSession } from "@/components/useSessionGuard";

// Pages sans layout admin (vendeur, publiques, auth)
const PAGES_SANS_LAYOUT_ADMIN = new Set([
  // Auth
  "Connexion",
  // Vendeur (mobile standalone)
  "EspaceVendeur", "InscriptionVendeur", "VideoFormation", "CatalogueVendeur",
  "NouvelleCommandeVendeur", "MesCommandesVendeur", "ProfilVendeur",
  "DemandePaiement", "NotificationsVendeur", "AideVendeur",
  // Intermédiaires
  "EnAttenteValidation", "ResoumissionKYC",
  // Sous-admin (a son propre layout)
  "EspaceSousAdmin",
]);

export default function Layout({ children, currentPageName }) {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);
  const [badges, setBadges] = useState({ commandes: 0, kyc: 0 });
  const vendeurSession = getVendeurSession();

  // Charger les badges (compteurs de notifications)
  useEffect(() => {
    if (PAGES_VENDEUR.includes(currentPageName)) return;
    const chargerBadges = async () => {
      try {
        const [cmdAttente, kycAttente] = await Promise.all([
          base44.entities.CommandeVendeur.filter({ statut: "en_attente_validation_admin" }),
          base44.entities.Seller.filter({ statut_kyc: "en_attente" }),
        ]);
        setBadges({
          commandes: cmdAttente.length,
          kyc: kycAttente.length,
        });
      } catch (_) {}
    };
    chargerBadges();
  }, [currentPageName]);

  // Pages vendeur : rendu sans layout admin
  if (PAGES_VENDEUR.includes(currentPageName) || vendeurSession) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar fixe */}
      <AdminSidebar
        isOpen={sidebarOuverte}
        onClose={() => setSidebarOuverte(false)}
        badges={badges}
      />

      {/* Zone droite : header + contenu */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header fixe */}
        <AdminHeader
          currentPageName={currentPageName}
          onMenuOpen={() => setSidebarOuverte(true)}
        />

        {/* Contenu scrollable */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}