import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, X, LogOut } from "lucide-react";
import { LOGO_URL as LOGO } from "@/components/constants";
import { getMenuVisible } from "./adminMenuConfig";
import { getAdminSession, getSousAdminSession, clearAllSessions } from "@/components/useSessionGuard";
import { createPageUrl } from "@/utils";

export default function AdminSidebar({ isOpen, onClose, badges = {}, isDesktop = false }) {
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

  // Sur desktop on est toujours visible, sur mobile on utilise l'overlay
  const sidebarStyle = isDesktop
    ? {
        width: 256,
        height: "100vh",
        background: "#1a1f5e",
        color: "white",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }
    : {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 256,
        height: "100vh",
        background: "#1a1f5e",
        color: "white",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease",
      };

  return (
    <>
      {/* Overlay mobile */}
      {!isDesktop && isOpen && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 199,
          }}
          onClick={onClose}
        />
      )}

      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{
          height: 64, display: "flex", alignItems: "center",
          padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}>
          <img
            src={LOGO}
            alt="Zonite"
            style={{ height: 36, width: 36, borderRadius: 8, background: "white", padding: 2, objectFit: "contain", flexShrink: 0 }}
          />
          <div style={{ marginLeft: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>ZONITE</div>
            <div style={{ fontSize: 10, color: "#F5C518", fontWeight: 600, letterSpacing: 2, marginTop: 2 }}>
              {sousAdmin ? sousAdmin.nom_role.toUpperCase() : "GESTION"}
            </div>
          </div>
          {!isDesktop && (
            <button
              onClick={onClose}
              style={{ marginLeft: "auto", color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Bandeau identité */}
        {(adminSession || sousAdmin) && (
          <div style={{
            padding: "8px 12px",
            background: "rgba(245,197,24,0.1)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, color: "#F5C518", fontWeight: 600 }}>Connecté en tant que :</div>
            <div style={{ fontSize: 12, color: "white", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sousAdmin ? sousAdmin.nom_complet : "Administrateur Principal"}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {menuItems.map((item) => {
            const estActif = currentPage === item.page || location.pathname === `/${item.page}`;
            const Icon = item.icon;
            const badge = item.badge ? (badges[item.badge] || 0) : 0;

            return (
              <Link
                key={item.id}
                to={`/${item.page}`}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: estActif ? 700 : 500,
                  marginBottom: 2,
                  textDecoration: "none",
                  background: estActif ? "#F5C518" : "transparent",
                  color: estActif ? "#1a1f5e" : "#CBD5E1",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { if (!estActif) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white"; }}}
                onMouseLeave={e => { if (!estActif) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#CBD5E1"; }}}
              >
                <Icon size={16} style={{ flexShrink: 0, color: estActif ? "#1a1f5e" : "#94A3B8" }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                {badge > 0 && (
                  <span style={{
                    minWidth: 20, height: 20, background: "#ef4444", color: "white",
                    fontSize: 10, fontWeight: 700, borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", flexShrink: 0,
                  }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {estActif && badge === 0 && <ChevronRight size={12} style={{ flexShrink: 0 }} />}
              </Link>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <button
            onClick={deconnexion}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, width: "100%",
              background: "none", border: "none", cursor: "pointer",
              color: "#94A3B8", fontSize: 13, fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}