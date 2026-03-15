import React from "react";
import { Menu } from "lucide-react";
import { LOGO_URL as LOGO } from "@/components/constants";
import { ADMIN_MENU } from "./adminMenuConfig";
import NotificationCenter from "@/components/NotificationCenter";
import { getAdminSession, getSousAdminSession } from "@/components/useSessionGuard";

export default function AdminHeader({ currentPageName, onMenuOpen, showBurger = false }) {
  const sousAdmin = getSousAdminSession();
  const adminSession = getAdminSession();

  const pageTitle =
    ADMIN_MENU.find((i) => i.page === currentPageName)?.label || "ZONITE";

  return (
    <header style={{
      height: 56,
      background: "white",
      borderBottom: "1px solid #E2E8F0",
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      gap: 12,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Burger mobile */}
      {showBurger && (
        <button
          onClick={onMenuOpen}
          style={{
            padding: "6px", marginLeft: -6, borderRadius: 8,
            color: "#475569", background: "none", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center",
          }}
        >
          <Menu size={22} />
        </button>
      )}

      {/* Logo mobile */}
      {showBurger && (
        <img
          src={LOGO}
          alt="Zonite"
          style={{ height: 28, width: 28, borderRadius: 6, objectFit: "contain", flexShrink: 0 }}
        />
      )}

      {/* Titre */}
      <h1 style={{
        flex: 1, fontSize: 15, fontWeight: 600, color: "#0F172A",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        margin: 0,
      }}>
        {pageTitle}
      </h1>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <NotificationCenter />
        {adminSession && (
          <span style={{
            fontSize: 11, background: "rgba(245,197,24,0.2)", color: "#1a1f5e",
            fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            whiteSpace: "nowrap",
          }}>
            Admin Principal
          </span>
        )}
        {sousAdmin && (
          <span style={{
            fontSize: 11, background: "rgba(245,197,24,0.2)", color: "#1a1f5e",
            fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            whiteSpace: "nowrap",
          }}>
            {sousAdmin.nom_role}
          </span>
        )}
      </div>
    </header>
  );
}