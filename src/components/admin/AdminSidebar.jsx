import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, X, LogOut } from "lucide-react";
import { LOGO_URL as LOGO } from "@/components/constants";
import { getMenuVisible } from "./adminMenuConfig";
import { getAdminSession, getSousAdminSession, clearAllSessions } from "@/components/useSessionGuard";
import { createPageUrl } from "@/utils";

export default function AdminSidebar({ isOpen, onClose, badges = {} }) {
  const location = useLocation();
  const sousAdmin = getSousAdminSession();
  const adminSession = getAdminSession();

  const role = sousAdmin ? "sous_admin" : "admin";
  const permissions = sousAdmin?.permissions || [];
  const menuItems = getMenuVisible(role, permissions);

  const deconnexion = () => {
    clearAllSessions();
    window.location.href = createPageUrl("Connexion");
  };

  const currentPage = location.pathname.replace("/", "");

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 flex-shrink-0
          bg-[#1a1f5e] text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ height: "100vh" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10 flex-shrink-0">
          <img
            src={LOGO}
            alt="Zonite"
            className="h-9 w-9 rounded-lg object-contain bg-white p-0.5 flex-shrink-0"
          />
          <div className="ml-2">
            <span className="text-base font-bold tracking-tight leading-none">ZONITE</span>
            <span className="block text-[10px] font-medium text-yellow-400 tracking-widest leading-none">
              {sousAdmin ? sousAdmin.nom_role.toUpperCase() : "GESTION"}
            </span>
          </div>
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bandeau identité */}
        {(adminSession || sousAdmin) && (
          <div className="px-3 py-2 bg-[#F5C518]/10 border-b border-white/10 flex-shrink-0">
            <p className="text-[10px] text-yellow-300 font-semibold">Connecté en tant que :</p>
            <p className="text-xs text-white font-medium truncate">
              {sousAdmin ? sousAdmin.nom_complet : "Administrateur Principal"}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const estActif = currentPage === item.page || location.pathname === `/${item.page}`;
            const Icon = item.icon;
            const badge = item.badge ? (badges[item.badge] || 0) : 0;

            return (
              <Link
                key={item.id}
                to={`/${item.page}`}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 group relative
                  ${estActif
                    ? "bg-[#F5C518] text-[#1a1f5e] font-bold shadow-md"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${estActif ? "text-[#1a1f5e]" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {estActif && badge === 0 && (
                  <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <div className="p-2 border-t border-white/10 flex-shrink-0">
          <button
            onClick={deconnexion}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}