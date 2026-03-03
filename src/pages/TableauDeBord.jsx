import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ShoppingCart,
  Package,
  Users
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CarteStatistique from "@/components/dashboard/CarteStatistique";
import GraphiqueVentes from "@/components/dashboard/GraphiqueVentes";
import TopProduits from "@/components/dashboard/TopProduits";
import TopVendeurs from "@/components/dashboard/TopVendeurs";
import StockCritique from "@/components/dashboard/StockCritique";

export default function TableauDeBord() {
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

  // Calculs
  const chiffreAffaires = ventes
    .filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee")
    .reduce((s, v) => s + (v.montant_total || 0), 0);

  const profitNet = ventes
    .filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee")
    .reduce((s, v) => s + (v.profit_zonite || 0), 0);

  const commissionsAPayer = vendeurs.reduce((s, v) => s + (v.solde_commission || 0), 0);

  const stockCritique = produits.filter(p => (p.stock_actuel || 0) <= (p.seuil_alerte || 5)).length;

  const aujourdhui = new Date().toISOString().split("T")[0];
  const commandesDuJour = ventes.filter(v => {
    const d = v.date_vente ? v.date_vente.split("T")[0] : v.created_date?.split("T")[0];
    return d === aujourdhui;
  }).length;

  const topProduit = [...produits].sort((a, b) => (b.total_vendu || 0) - (a.total_vendu || 0))[0];
  const topVendeur = [...vendeurs].sort((a, b) => (b.chiffre_affaires_genere || 0) - (a.chiffre_affaires_genere || 0))[0];

  const formaterMontant = (n) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

  // Stats vendeurs app
  const commandesVendeursAujourdhui = commandesVendeurs.filter(c => {
    const d = c.created_date?.split("T")[0];
    return d === new Date().toISOString().split("T")[0];
  }).length;

  const commissionsVendeursAPayer = paiementsEnAttente.reduce((s, p) => s + (p.montant || 0), 0);

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
      {/* Alertes actions requises */}
      {(candidaturesEnAttente.length > 0 || kycEnAttente.length > 0 || paiementsEnAttente.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="font-semibold text-yellow-800 text-sm mb-2">⚠️ Actions requises</p>
          <div className="flex flex-wrap gap-2">
            {candidaturesEnAttente.length > 0 && (
              <a href={`#/GestionCandidatures`} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                {candidaturesEnAttente.length} candidature{candidaturesEnAttente.length > 1 ? "s" : ""} en attente
              </a>
            )}
            {kycEnAttente.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                {kycEnAttente.length} KYC à valider
              </span>
            )}
            {paiementsEnAttente.length > 0 && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                {paiementsEnAttente.length} paiement{paiementsEnAttente.length > 1 ? "s" : ""} en attente ({formaterMontant(commissionsVendeursAPayer)})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Cartes statistiques Admin */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Ventes Directes (Admin)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CarteStatistique titre="Chiffre d'Affaires Total" valeur={formaterMontant(chiffreAffaires)} icone={DollarSign} couleur="bleu" />
          <CarteStatistique titre="Profit Net" valeur={formaterMontant(profitNet)} icone={TrendingUp} couleur="vert" />
          <CarteStatistique titre="Commissions à Payer" valeur={formaterMontant(commissionsAPayer)} icone={Wallet} couleur="orange" />
          <CarteStatistique titre="Commandes du Jour" valeur={commandesDuJour} icone={ShoppingCart} couleur="violet" />
        </div>
      </div>

      {/* Cartes statistiques Vendeurs */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Application Vendeurs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CarteStatistique titre="Commandes Vendeurs Aujourd'hui" valeur={commandesVendeursAujourdhui} icone={ShoppingCart} couleur="indigo" />
          <CarteStatistique titre="Total Commandes Vendeurs" valeur={commandesVendeurs.length} icone={Package} couleur="jaune" />
          <CarteStatistique titre="Stock Critique" valeur={stockCritique} icone={AlertTriangle} couleur={stockCritique > 0 ? "rouge" : "vert"} />
          <CarteStatistique titre="Top Produit" valeur={topProduit?.nom || "—"} icone={Package} couleur="bleu" />
        </div>
      </div>

      {/* Graphiques et listes */}
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