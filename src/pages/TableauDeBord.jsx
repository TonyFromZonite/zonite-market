import React, { useState, useEffect } from "react";

// Composant helper pour 2 colonnes sur desktop, 1 sur mobile
function ResponsiveRow({ children }) {
  const [isWide, setIsWide] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsWide(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return (
    <div style={{ display: "grid", gridTemplateColumns: isWide ? "1fr 1fr" : "1fr", gap: 16 }}>
      {children}
    </div>
  );
}
import { base44 } from "@/api/base44Client";
import { useCachedQuery } from "@/components/CacheManager";
import {
  DollarSign, TrendingUp, Wallet, AlertTriangle,
  ShoppingCart, Package, Users, ShieldCheck, Lock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CarteStatistique from "@/components/dashboard/CarteStatistique";
import GraphiqueVentes from "@/components/dashboard/GraphiqueVentes";
import TopProduits from "@/components/dashboard/TopProduits";
import TopVendeurs from "@/components/dashboard/TopVendeurs";
import StockCritique from "@/components/dashboard/StockCritique";
import { getAdminSession, getSousAdminSession } from "@/components/useSessionGuard";

const formaterMontant = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

// Dashboard simplifié pour sous-admins
function DashboardSousAdmin({ sousAdmin }) {
  const { data: commandesVendeurs = [], isLoading: chargCmd } = useCachedQuery(
    'COMMANDES',
    () => base44.entities.CommandeVendeur.list("-created_date", 100),
    { ttl: 5 * 60 * 1000, enabled: true }
  );

  const { data: produits = [] } = useCachedQuery(
    'PRODUITS',
    () => base44.entities.Produit.list(),
    { ttl: 30 * 60 * 1000, enabled: (sousAdmin.permissions || []).includes("Produits") }
  );

  const aujourd = new Date().toISOString().split("T")[0];

  const cmdAujourdhui = commandesVendeurs.filter(c => c.created_date?.split("T")[0] === aujourd).length;
  const cmdAttente = commandesVendeurs.filter(c => c.statut === "en_attente_validation_admin").length;
  const cmdEnLivraison = commandesVendeurs.filter(c => c.statut === "en_livraison").length;
  const cmdLivrees = commandesVendeurs.filter(c => c.statut === "livree").length;

  const modules = [
    { page: "CommandesVendeurs", label: "Commandes Vendeurs", emoji: "📋" },
    { page: "Produits", label: "Produits", emoji: "📦" },
    { page: "Livraisons", label: "Livraisons", emoji: "🚚" },
    { page: "SupportAdmin", label: "Support Vendeurs", emoji: "💬" },
    { page: "Vendeurs", label: "Vendeurs", emoji: "👥" },
    { page: "JournalAudit", label: "Journal d'Audit", emoji: "🛡️" },
  ].filter((m) => (sousAdmin.permissions || []).includes(m.page));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Bandeau identité */}
      <div style={{
        background: "linear-gradient(to right, #1a1f5e, #2d34a5)",
        borderRadius: 12, padding: 20, color: "white",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, background: "#F5C518", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <ShieldCheck size={24} color="#1a1f5e" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{sousAdmin.nom_complet}</p>
          <p style={{ color: "#FDE68A", fontSize: 13, marginTop: 2 }}>{sousAdmin.nom_role}</p>
          <p style={{ color: "#CBD5E1", fontSize: 11, marginTop: 2 }}>
            Accès limité à {(sousAdmin.permissions || []).length} module(s)
          </p>
        </div>
      </div>

      {/* Stats commandes */}
      {(sousAdmin.permissions || []).includes("CommandesVendeurs") && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Aperçu Commandes</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <CarteStatistique titre="Aujourd'hui" valeur={cmdAujourdhui} icone={ShoppingCart} couleur="bleu" />
            <CarteStatistique titre="En attente" valeur={cmdAttente} icone={ShoppingCart} couleur="orange" />
            <CarteStatistique titre="En livraison" valeur={cmdEnLivraison} icone={ShoppingCart} couleur="violet" />
            <CarteStatistique titre="Livrées" valeur={cmdLivrees} icone={ShoppingCart} couleur="vert" />
          </div>
        </div>
      )}

      {/* Modules */}
      {modules.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Mes Modules</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {modules.map((m) => (
              <Link key={m.page} to={createPageUrl(m.page)} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "white", borderRadius: 12, border: "1px solid #E2E8F0",
                  padding: 16, cursor: "pointer",
                }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>{m.emoji}</span>
                  <p style={{ fontWeight: 600, color: "#1E293B", fontSize: 13 }}>{m.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {modules.length === 0 && (
        <div style={{
          background: "white", borderRadius: 12, border: "1px solid #E2E8F0",
          padding: 40, textAlign: "center",
        }}>
          <Lock size={40} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "#64748B", fontSize: 13 }}>Aucun module accessible. Contactez l'administrateur principal.</p>
        </div>
      )}
    </div>
  );
}

// Dashboard complet pour admin principal
function DashboardAdmin() {
  const { data: ventes = [], isLoading: chargementVentes } = useCachedQuery(
    'VENTES',
    () => base44.entities.Vente.list("-created_date", 100),
    { ttl: 10 * 60 * 1000 }
  );

  const { data: produits = [], isLoading: chargementProduits } = useCachedQuery(
    'PRODUITS',
    () => base44.entities.Produit.list(),
    { ttl: 30 * 60 * 1000 }
  );

  // Filtrer les produits supprimés
  const produitsActifs = (Array.isArray(produits) ? produits : []).filter(p => p.statut !== 'supprime');

  const { data: vendeurs = [], isLoading: chargementVendeurs } = useCachedQuery(
    'VENDEURS',
    () => base44.entities.Seller.list(),
    { ttl: 60 * 60 * 1000 }
  );

  // Filtrer les vendeurs inactifs
  const vendeursActifs = (Array.isArray(vendeurs) ? vendeurs : []).filter(v => v.statut === 'actif');

  const { data: commandesVendeurs = [] } = useCachedQuery(
    'COMMANDES',
    () => base44.entities.CommandeVendeur.list("-created_date", 100),
    { ttl: 5 * 60 * 1000 }
  );

  const { data: candidaturesEnAttente } = useCachedQuery(
    'CANDIDATURES',
    () => base44.entities.CandidatureVendeur.filter({ statut: "en_attente" }),
    { ttl: 15 * 60 * 1000 }
  );

  const { data: kycEnAttente } = useCachedQuery(
    'KYC',
    () => base44.entities.Seller.filter({ statut_kyc: "en_attente" }),
    { ttl: 15 * 60 * 1000 }
  );

  const { data: paiementsEnAttente } = useCachedQuery(
    'PAIEMENTS',
    () => base44.entities.DemandePaiementVendeur.filter({ statut: "en_attente" }),
    { ttl: 15 * 60 * 1000 }
  );

  const enChargement = chargementVentes || chargementProduits || chargementVendeurs;

  const ventesArray = Array.isArray(ventes) ? ventes : [];
  const produitsArray = Array.isArray(produitsActifs) ? produitsActifs : [];
  const vendeursArray = Array.isArray(vendeursActifs) ? vendeursActifs : [];
  const commandesArray = Array.isArray(commandesVendeurs) ? commandesVendeurs : [];
  const candidaturesArray = Array.isArray(candidaturesEnAttente) && candidaturesEnAttente !== null ? candidaturesEnAttente : [];
  const kycArray = Array.isArray(kycEnAttente) && kycEnAttente !== null ? kycEnAttente : [];
  const paiementsArray = Array.isArray(paiementsEnAttente) && paiementsEnAttente !== null ? paiementsEnAttente : [];

  const chiffreAffaires = ventesArray
    .filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee")
    .reduce((s, v) => s + (v.montant_total || 0), 0);

  const profitNet = ventesArray
    .filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee")
    .reduce((s, v) => s + (v.profit_zonite || 0), 0);

  const commissionsAPayer = vendeursArray.reduce((s, v) => s + (v.solde_commission || 0), 0);
  const stockCritique = produitsArray.filter(p => (p.stock_global || 0) <= (p.seuil_alerte_global || 5)).length;

  const aujourdhui = new Date().toISOString().split("T")[0];
  const commandesDuJour = ventesArray.filter(v => {
    const d = v.date_vente ? v.date_vente.split("T")[0] : v.created_date?.split("T")[0];
    return d === aujourdhui;
  }).length;

  const topProduit = [...produitsArray].sort((a, b) => (b.total_vendu || 0) - (a.total_vendu || 0))[0] || {};
  const commandesVendeursAujourdhui = commandesArray.filter(c => c.created_date?.split("T")[0] === aujourdhui).length;
  const commissionsVendeursAPayer = paiementsArray.reduce((s, p) => s + (p.montant || 0), 0);

  if (enChargement) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} style={{ height: 96, borderRadius: 12, background: "#E2E8F0", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Alertes */}
      {(candidaturesArray.length > 0 || kycArray.length > 0 || paiementsArray.length > 0) && (
        <div style={{ background: "#FEFCE8", border: "1px solid #FDE68A", borderRadius: 12, padding: 16 }}>
          <p style={{ fontWeight: 600, color: "#92400E", fontSize: 13, marginBottom: 8 }}>⚠️ Actions requises</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {candidaturesArray.length > 0 && (
              <Link to={createPageUrl("Vendeurs")} style={{ fontSize: 12, background: "#FEF3C7", color: "#92400E", padding: "4px 10px", borderRadius: 20, fontWeight: 500, textDecoration: "none" }}>
                {candidaturesArray.length} candidature{candidaturesArray.length > 1 ? "s" : ""} en attente
              </Link>
            )}
            {kycArray.length > 0 && (
              <Link to={createPageUrl("Vendeurs")} style={{ fontSize: 12, background: "#FFEDD5", color: "#9A3412", padding: "4px 10px", borderRadius: 20, fontWeight: 500, textDecoration: "none" }}>
                {kycArray.length} KYC à valider
              </Link>
            )}
            {paiementsArray.length > 0 && (
              <Link to={createPageUrl("Vendeurs")} style={{ fontSize: 12, background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: 20, fontWeight: 500, textDecoration: "none" }}>
                {paiementsArray.length} paiement{paiementsArray.length > 1 ? "s" : ""} en attente ({formaterMontant(commissionsVendeursAPayer)})
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Ventes Directes */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Ventes Directes (Admin)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <CarteStatistique titre="Chiffre d'Affaires" valeur={formaterMontant(chiffreAffaires)} icone={DollarSign} couleur="bleu" />
          <CarteStatistique titre="Profit Net" valeur={formaterMontant(profitNet)} icone={TrendingUp} couleur="vert" />
          <CarteStatistique titre="Commissions à Payer" valeur={formaterMontant(commissionsAPayer)} icone={Wallet} couleur="orange" />
          <CarteStatistique titre="Commandes du Jour" valeur={commandesDuJour} icone={ShoppingCart} couleur="violet" />
        </div>
      </div>

      {/* Application Vendeurs */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Application Vendeurs</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <CarteStatistique titre="Cmds Vendeurs Aujourd'hui" valeur={commandesVendeursAujourdhui} icone={ShoppingCart} couleur="indigo" />
          <CarteStatistique titre="Total Commandes" valeur={commandesArray.length} icone={Package} couleur="jaune" />
          <CarteStatistique titre="Stock Critique" valeur={stockCritique} icone={AlertTriangle} couleur={stockCritique > 0 ? "rouge" : "vert"} />
          <CarteStatistique titre="Top Produit" valeur={topProduit?.nom || "—"} icone={Package} couleur="bleu" />
        </div>
      </div>

      {/* Graphiques côte à côte sur desktop */}
      <ResponsiveRow>
        <GraphiqueVentes ventes={ventesArray} />
        <StockCritique produits={produitsArray} />
      </ResponsiveRow>

      <ResponsiveRow>
        <TopProduits produits={produitsArray} />
        <TopVendeurs vendeurs={vendeursArray} />
      </ResponsiveRow>
    </div>
  );
}

export default function TableauDeBord() {
  const sousAdmin = getSousAdminSession();
  const adminSession = getAdminSession();

  if (sousAdmin) {
    return <DashboardSousAdmin sousAdmin={sousAdmin} />;
  }

  if (adminSession) {
    return <DashboardAdmin />;
  }

  // Vérifier si connecté via Base44 auth
  return <DashboardAdmin />;
}