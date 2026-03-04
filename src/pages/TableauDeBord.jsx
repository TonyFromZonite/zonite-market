import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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

function getSousAdminSession() {
  try {
    const data = sessionStorage.getItem("sous_admin");
    return data ? JSON.parse(data) : null;
  } catch (_) { return null; }
}

function getAdminSession() {
  try {
    const data = sessionStorage.getItem("admin_session");
    return data ? JSON.parse(data) : null;
  } catch (_) { return null; }
}

// Dashboard simplifié pour sous-admins
function DashboardSousAdmin({ sousAdmin }) {
  const { data: commandesVendeurs = [], isLoading: chargCmd } = useQuery({
    queryKey: ["commandes_vendeurs_sous_admin"],
    queryFn: () => base44.entities.CommandeVendeur.list("-created_date", 100),
  });

  const { data: produits = [] } = useQuery({
    queryKey: ["produits_sous_admin"],
    queryFn: () => base44.entities.Produit.list(),
    enabled: (sousAdmin.permissions || []).includes("Produits"),
  });

  const formatMontant = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
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
    <div className="space-y-6">
      {/* Bandeau identité */}
      <div className="bg-gradient-to-r from-[#1a1f5e] to-[#2d34a5] rounded-xl p-5 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-[#F5C518] rounded-xl flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-[#1a1f5e]" />
        </div>
        <div>
          <p className="font-bold text-lg leading-tight">{sousAdmin.nom_complet}</p>
          <p className="text-yellow-300 text-sm">{sousAdmin.nom_role}</p>
          <p className="text-slate-300 text-xs mt-0.5">
            Accès limité à {(sousAdmin.permissions || []).length} module(s)
          </p>
        </div>
      </div>

      {/* Stats commandes */}
      {(sousAdmin.permissions || []).includes("CommandesVendeurs") && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Aperçu Commandes</p>
          {chargCmd ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <CarteStatistique titre="Aujourd'hui" valeur={cmdAujourdhui} icone={ShoppingCart} couleur="bleu" />
              <CarteStatistique titre="En attente" valeur={cmdAttente} icone={ShoppingCart} couleur="orange" />
              <CarteStatistique titre="En livraison" valeur={cmdEnLivraison} icone={ShoppingCart} couleur="violet" />
              <CarteStatistique titre="Livrées" valeur={cmdLivrees} icone={ShoppingCart} couleur="vert" />
            </div>
          )}
        </div>
      )}

      {/* Accès rapides aux modules autorisés */}
      {modules.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Mes Modules</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {modules.map((m) => (
              <Link key={m.page} to={createPageUrl(m.page)}>
                <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#1a1f5e]/30 hover:shadow-md transition-all cursor-pointer">
                  <span className="text-2xl block mb-2">{m.emoji}</span>
                  <p className="font-semibold text-slate-800 text-sm">{m.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {modules.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Lock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucun module accessible. Contactez l'administrateur principal.</p>
        </div>
      )}
    </div>
  );
}

// Dashboard complet pour admin principal
function DashboardAdmin() {
  const { data: ventes = [], isLoading: chargementVentes } = useQuery({
    queryKey: ["ventes"],
    queryFn: () => base44.entities.Vente.list("-created_date", 500),
  });

  const { data: produits = [], isLoading: chargementProduits } = useQuery({
    queryKey: ["produits"],
    queryFn: () => base44.entities.Produit.list(),
  });

  const { data: vendeurs = [], isLoading: chargementVendeurs } = useQuery({
    queryKey: ["vendeurs"],
    queryFn: () => base44.entities.Vendeur.list(),
  });

  const { data: commandesVendeurs = [] } = useQuery({
    queryKey: ["commandes_vendeurs_stats"],
    queryFn: () => base44.entities.CommandeVendeur.list("-created_date", 200),
  });

  const { data: candidaturesEnAttente = [] } = useQuery({
    queryKey: ["candidatures_attente"],
    queryFn: () => base44.entities.CandidatureVendeur.filter({ statut: "en_attente" }),
  });

  const { data: kycEnAttente = [] } = useQuery({
    queryKey: ["kyc_attente"],
    queryFn: () => base44.entities.CompteVendeur.filter({ statut_kyc: "en_attente" }),
  });

  const { data: paiementsEnAttente = [] } = useQuery({
    queryKey: ["paiements_attente"],
    queryFn: () => base44.entities.DemandePaiementVendeur.filter({ statut: "en_attente" }),
  });

  const enChargement = chargementVentes || chargementProduits || chargementVendeurs;

  const chiffreAffaires = ventes
    .filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee")
    .reduce((s, v) => s + (v.montant_total || 0), 0);

  const profitNet = ventes
    .filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee")
    .reduce((s, v) => s + (v.profit_zonite || 0), 0);

  const commissionsAPayer = vendeurs.reduce((s, v) => s + (v.solde_commission || 0), 0);
  const stockCritique = produits.filter(p => (p.stock_global || 0) <= (p.seuil_alerte_global || 5)).length;

  const aujourdhui = new Date().toISOString().split("T")[0];
  const commandesDuJour = ventes.filter(v => {
    const d = v.date_vente ? v.date_vente.split("T")[0] : v.created_date?.split("T")[0];
    return d === aujourdhui;
  }).length;

  const topProduit = [...produits].sort((a, b) => (b.total_vendu || 0) - (a.total_vendu || 0))[0];
  const commandesVendeursAujourdhui = commandesVendeurs.filter(c => c.created_date?.split("T")[0] === aujourdhui).length;
  const commissionsVendeursAPayer = paiementsEnAttente.reduce((s, p) => s + (p.montant || 0), 0);

  const formaterMontant = (n) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

  if (enChargement) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertes */}
      {(candidaturesEnAttente.length > 0 || kycEnAttente.length > 0 || paiementsEnAttente.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="font-semibold text-yellow-800 text-sm mb-2">⚠️ Actions requises</p>
          <div className="flex flex-wrap gap-2">
            {candidaturesEnAttente.length > 0 && (
              <Link to={createPageUrl("Vendeurs")} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium hover:bg-yellow-200">
                {candidaturesEnAttente.length} candidature{candidaturesEnAttente.length > 1 ? "s" : ""} en attente
              </Link>
            )}
            {kycEnAttente.length > 0 && (
              <Link to={createPageUrl("Vendeurs")} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium hover:bg-orange-200">
                {kycEnAttente.length} KYC à valider
              </Link>
            )}
            {paiementsEnAttente.length > 0 && (
              <Link to={createPageUrl("Vendeurs")} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium hover:bg-red-200">
                {paiementsEnAttente.length} paiement{paiementsEnAttente.length > 1 ? "s" : ""} en attente ({formaterMontant(commissionsVendeursAPayer)})
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Ventes Directes */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Ventes Directes (Admin)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CarteStatistique titre="Chiffre d'Affaires Total" valeur={formaterMontant(chiffreAffaires)} icone={DollarSign} couleur="bleu" />
          <CarteStatistique titre="Profit Net" valeur={formaterMontant(profitNet)} icone={TrendingUp} couleur="vert" />
          <CarteStatistique titre="Commissions à Payer" valeur={formaterMontant(commissionsAPayer)} icone={Wallet} couleur="orange" />
          <CarteStatistique titre="Commandes du Jour" valeur={commandesDuJour} icone={ShoppingCart} couleur="violet" />
        </div>
      </div>

      {/* Application Vendeurs */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Application Vendeurs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CarteStatistique titre="Commandes Vendeurs Aujourd'hui" valeur={commandesVendeursAujourdhui} icone={ShoppingCart} couleur="indigo" />
          <CarteStatistique titre="Total Commandes Vendeurs" valeur={commandesVendeurs.length} icone={Package} couleur="jaune" />
          <CarteStatistique titre="Stock Critique" valeur={stockCritique} icone={AlertTriangle} couleur={stockCritique > 0 ? "rouge" : "vert"} />
          <CarteStatistique titre="Top Produit" valeur={topProduit?.nom || "—"} icone={Package} couleur="bleu" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraphiqueVentes ventes={ventes} />
        <StockCritique produits={produits} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProduits produits={produits} />
        <TopVendeurs vendeurs={vendeurs} />
      </div>
    </div>
  );
}

export default function TableauDeBord() {
  const [sousAdmin] = useState(() => getSousAdminSession());

  if (sousAdmin) {
    return <DashboardSousAdmin sousAdmin={sousAdmin} />;
  }

  return <DashboardAdmin />;
}