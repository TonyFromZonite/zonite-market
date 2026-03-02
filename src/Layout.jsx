import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  ClipboardList,
  DollarSign,
  Shield,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Tag } from
"lucide-react";
import { base44 } from "@/api/base44Client";

// Pages de l'Application Vendeur (interface vendeur mobile)
const PAGES_VENDEUR = [
  "EspaceVendeur", "InscriptionVendeur", "VideoFormation", "CatalogueVendeur",
  "NouvelleCommandeVendeur", "MesCommandesVendeur", "ProfilVendeur",
  "DemandePaiement", "NotificationsVendeur", "Candidature"
];

const menuItems = [
{ nom: "Tableau de Bord", page: "TableauDeBord", icone: LayoutDashboard },
{ nom: "Nouvelle Vente", page: "NouvelleVente", icone: ShoppingCart },
{ nom: "Commandes Admin", page: "Commandes", icone: ClipboardList },
{ nom: "Commandes Vendeurs", page: "CommandesVendeurs", icone: ShoppingCart },
{ nom: "Produits", page: "Produits", icone: Package },
{ nom: "Catégories", page: "Categories", icone: Tag },
{ nom: "Vendeurs", page: "Vendeurs", icone: Users },
{ nom: "Candidatures", page: "GestionCandidatures", icone: Users },
{ nom: "Validation KYC", page: "GestionKYC", icone: Shield },
{ nom: "Paiements Vendeurs", page: "PaiementsVendeurs", icone: DollarSign },
{ nom: "Livraisons", page: "Livraisons", icone: Truck },
{ nom: "Commissions", page: "Commissions", icone: DollarSign },
{ nom: "Journal d'Audit", page: "JournalAudit", icone: Shield }];


export default function Layout({ children, currentPageName }) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  const deconnexion = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay mobile */}
      {menuOuvert &&
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={() => setMenuOuvert(false)} />

      }

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1a1f5e] text-white transform transition-transform duration-300 ease-in-out flex flex-col ${
        menuOuvert ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`
        }>

        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg"
              alt="Zonite Market"
              className="h-10 w-10 rounded-lg object-contain bg-white p-0.5" />

            <div>
              <span className="text-base font-bold tracking-tight leading-none">ZONITE </span>
              <span className="block text-[10px] font-medium text-yellow-400 tracking-widest leading-none">Gestation </span>
            </div>
          </div>
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white"
            onClick={() => setMenuOuvert(false)}>

            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const estActif = currentPageName === item.page;
            const Icone = item.icone;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMenuOuvert(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                estActif ?
                "bg-[#F5C518] text-[#1a1f5e] shadow-lg shadow-yellow-400/30 font-bold" :
                "text-slate-300 hover:bg-white/10 hover:text-white"}`
                }>

                <Icone className={`w-4.5 h-4.5 ${estActif ? "text-[#1a1f5e]" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span>{item.nom}</span>
                {estActif && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>);

          })}
        </nav>

        {/* Déconnexion */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={deconnexion}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/8 hover:text-white transition-all w-full">

            <LogOut className="w-4.5 h-4.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setMenuOuvert(true)}>

            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-3 lg:ml-0">
            <h1 className="text-lg font-semibold text-slate-900">
              {menuItems.find((i) => i.page === currentPageName)?.nom || "ZONITE"}
            </h1>
          </div>
        </header>

        {/* Contenu de la page */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>);

}