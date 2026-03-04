import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  ClipboardList, Shield, Menu, X, ChevronRight,
  LogOut, MessageSquare, UserCog, Settings
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import RechercheGlobale from "@/components/RechercheGlobale";

// Pages de l'Application Vendeur (interface vendeur mobile, sans sidebar admin)
const PAGES_VENDEUR = [
  "EspaceVendeur", "InscriptionVendeur", "VideoFormation", "CatalogueVendeur",
  "NouvelleCommandeVendeur", "MesCommandesVendeur", "ProfilVendeur",
  "DemandePaiement", "NotificationsVendeur", "Candidature", "AideVendeur",
  "Connexion", "EspaceSousAdmin"
];

const TOUS_LES_MENUS = [
  { nom: "Tableau de Bord",      page: "TableauDeBord",        icone: LayoutDashboard },
  { nom: "Nouvelle Vente",       page: "NouvelleVente",        icone: ShoppingCart },
  { nom: "Commandes Admin",      page: "Commandes",            icone: ClipboardList },
  { nom: "Commandes Vendeurs",   page: "CommandesVendeurs",    icone: ShoppingCart },
  { nom: "Produits",             page: "Produits",             icone: Package },
  { nom: "Vendeurs",             page: "Vendeurs",             icone: Users },
  { nom: "Livraisons",           page: "Livraisons",           icone: Truck },
  { nom: "Support Vendeurs",     page: "SupportAdmin",         icone: MessageSquare },
  { nom: "Journal d'Audit",      page: "JournalAudit",         icone: Shield },
  { nom: "Sous-Admins",          page: "GestionSousAdmins",    icone: UserCog },
  { nom: "Configuration App",    page: "ConfigurationApp",     icone: Settings },
];

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg";

// Récupérer la session sous-admin depuis sessionStorage
function getSousAdminSession() {
  try {
    const data = sessionStorage.getItem("sous_admin");
    return data ? JSON.parse(data) : null;
  } catch (_) { return null; }
}

export default function Layout({ children, currentPageName }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [nbCommandesAttente, setNbCommandesAttente] = useState(0);
  const [sousAdmin] = useState(() => getSousAdminSession());

  // Filtrer les menus selon le rôle
  const menuItems = sousAdmin
    ? TOUS_LES_MENUS.filter((item) =>
        item.page === "TableauDeBord" || (sousAdmin.permissions || []).includes(item.page)
      )
    : TOUS_LES_MENUS;

  useEffect(() => {
    const chargerBadges = async () => {
      const cmdAttente = await base44.entities.CommandeVendeur.filter({ statut: "en_attente_validation_admin" });
      setNbCommandesAttente(cmdAttente.length);
    };
    if (!PAGES_VENDEUR.includes(currentPageName)) chargerBadges();
  }, [currentPageName]);

  const deconnexion = () => {
    sessionStorage.removeItem("sous_admin");
    base44.auth.logout();
  };

  const deconnexionSousAdmin = () => {
    sessionStorage.removeItem("sous_admin");
    window.location.href = createPageUrl("Connexion");
  };

  // Pages vendeur : interface mobile standalone, sans sidebar admin
  if (PAGES_VENDEUR.includes(currentPageName)) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const getBadge = (page) => {
    if (page === "CommandesVendeurs" && nbCommandesAttente > 0) return nbCommandesAttente;
    return 0;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay mobile */}
      {menuOuvert && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMenuOuvert(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1a1f5e] text-white transform transition-transform duration-300 ease-in-out flex flex-col ${menuOuvert ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src={LOGO} alt="Zonite" className="h-9 w-9 rounded-lg object-contain bg-white p-0.5 flex-shrink-0" />
            <div>
              <span className="text-base font-bold tracking-tight leading-none">ZONITE</span>
              <span className="block text-[10px] font-medium text-yellow-400 tracking-widest leading-none">
                {sousAdmin ? sousAdmin.nom_role.toUpperCase() : "GESTION"}
              </span>
            </div>
          </div>
          <button className="ml-auto lg:hidden text-white/60 hover:text-white" onClick={() => setMenuOuvert(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bandeau sous-admin */}
        {sousAdmin && (
          <div className="px-3 py-2 bg-[#F5C518]/10 border-b border-white/10">
            <p className="text-[10px] text-yellow-300 font-semibold">Connecté en tant que :</p>
            <p className="text-xs text-white font-medium truncate">{sousAdmin.nom_complet}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const estActif = currentPageName === item.page;
            const Icone = item.icone;
            const badge = getBadge(item.page);
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMenuOuvert(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                  estActif
                    ? "bg-[#F5C518] text-[#1a1f5e] font-bold shadow-md"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icone className={`w-4 h-4 flex-shrink-0 ${estActif ? "text-[#1a1f5e]" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span className="flex-1 truncate">{item.nom}</span>
                {badge > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {estActif && !badge && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <div className="p-2 border-t border-white/10 flex-shrink-0">
          <button
            onClick={sousAdmin ? deconnexionSousAdmin : deconnexion}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 sticky top-0 z-30 gap-3">
          <button className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMenuOuvert(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <img src={LOGO} alt="Zonite" className="h-7 w-7 rounded-md object-contain lg:hidden flex-shrink-0" />
          <h1 className="text-base font-semibold text-slate-900 truncate flex-1">
            {TOUS_LES_MENUS.find((i) => i.page === currentPageName)?.nom || "ZONITE"}
          </h1>
          {!sousAdmin && <RechercheGlobale />}
          {sousAdmin && (
            <span className="text-xs bg-[#F5C518]/20 text-[#1a1f5e] font-semibold px-2 py-1 rounded-full hidden sm:block">
              {sousAdmin.nom_role}
            </span>
          )}
        </header>

        {/* Page */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}