import React from "react";
import { Menu } from "lucide-react";
import { LOGO_URL as LOGO } from "@/components/constants";
import { ADMIN_MENU } from "./adminMenuConfig";
import RechercheGlobale from "@/components/RechercheGlobale";
import NotificationCenter from "@/components/NotificationCenter";
import { getAdminSession, getSousAdminSession } from "@/components/useSessionGuard";

export default function AdminHeader({ currentPageName, onMenuOpen }) {
  const sousAdmin = getSousAdminSession();
  const adminSession = getAdminSession();

  const pageTitle =
    ADMIN_MENU.find((i) => i.page === currentPageName)?.label || "ZONITE";

  return (
    <header
      className="h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-3 flex-shrink-0"
      style={{ zIndex: 100 }}
    >
      {/* Burger mobile */}
      <button
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
        onClick={onMenuOpen}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo mobile seulement */}
      <img
        src={LOGO}
        alt="Zonite"
        className="h-7 w-7 rounded-md object-contain lg:hidden flex-shrink-0"
      />

      {/* Titre page */}
      <h1 className="text-base font-semibold text-slate-900 truncate flex-1">
        {pageTitle}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!sousAdmin && !adminSession && <RechercheGlobale />}
        <NotificationCenter />
        {adminSession && (
          <span className="text-xs bg-[#F5C518]/20 text-[#1a1f5e] font-semibold px-2 py-1 rounded-full hidden sm:block">
            Admin Principal
          </span>
        )}
        {sousAdmin && (
          <span className="text-xs bg-[#F5C518]/20 text-[#1a1f5e] font-semibold px-2 py-1 rounded-full hidden sm:block">
            {sousAdmin.nom_role}
          </span>
        )}
      </div>
    </header>
  );
}