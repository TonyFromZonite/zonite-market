import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getVendeurSession } from "@/components/useSessionGuard";

// Pages sans layout admin (vendeur, publiques, auth)
const PAGES_SANS_LAYOUT_ADMIN = new Set([
  "Connexion",
  "EspaceVendeur", "InscriptionVendeur", "VideoFormation", "CatalogueVendeur",
  "NouvelleCommandeVendeur", "MesCommandesVendeur", "ProfilVendeur",
  "DemandePaiement", "NotificationsVendeur", "AideVendeur",
  "EnAttenteValidation", "ResoumissionKYC",
  "EspaceSousAdmin",
]);

export default function Layout({ children, currentPageName }) {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);
  const [badges, setBadges] = useState({ commandes: 0, kyc: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const vendeurSession = getVendeurSession();

  // Détecter la largeur pour afficher/masquer la sidebar sur desktop
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = windowWidth >= 1024;

  // Fermer la sidebar quand on passe en desktop
  useEffect(() => {
    if (isDesktop) setSidebarOuverte(false);
  }, [isDesktop]);

  // Charger les badges
  useEffect(() => {
    if (PAGES_SANS_LAYOUT_ADMIN.has(currentPageName)) return;
    const chargerBadges = async () => {
      try {
        const [cmdAttente, kycAttente] = await Promise.all([
          base44.entities.CommandeVendeur.filter({ statut: "en_attente_validation_admin" }),
          base44.entities.Seller.filter({ statut_kyc: "en_attente" }),
        ]);
        setBadges({ commandes: cmdAttente.length, kyc: kycAttente.length });
      } catch (_) {}
    };
    chargerBadges();
  }, [currentPageName]);

  // Pages sans layout admin
  if (PAGES_SANS_LAYOUT_ADMIN.has(currentPageName) || vendeurSession) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      {/* Sidebar desktop : toujours visible */}
      {isDesktop && (
        <div style={{ width: 256, flexShrink: 0, height: "100vh" }}>
          <AdminSidebar isOpen={true} onClose={() => {}} badges={badges} isDesktop />
        </div>
      )}

      {/* Sidebar mobile : overlay */}
      {!isDesktop && (
        <AdminSidebar
          isOpen={sidebarOuverte}
          onClose={() => setSidebarOuverte(false)}
          badges={badges}
          isDesktop={false}
        />
      )}

      {/* Zone droite */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        <AdminHeader
          currentPageName={currentPageName}
          onMenuOpen={() => setSidebarOuverte(true)}
          showBurger={!isDesktop}
        />
        <main style={{ flex: 1, overflow: "auto", padding: isDesktop ? "24px" : "16px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}