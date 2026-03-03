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

  if (enChargement) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(7).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CarteStatistique
          titre="Chiffre d'Affaires Total"
          valeur={formaterMontant(chiffreAffaires)}
          icone={DollarSign}
          couleur="bleu"
        />
        <CarteStatistique
          titre="Profit Net"
          valeur={formaterMontant(profitNet)}
          icone={TrendingUp}
          couleur="vert"
        />
        <CarteStatistique
          titre="Commissions à Payer"
          valeur={formaterMontant(commissionsAPayer)}
          icone={Wallet}
          couleur="orange"
        />
        <CarteStatistique
          titre="Stock Critique"
          valeur={stockCritique}
          icone={AlertTriangle}
          couleur={stockCritique > 0 ? "rouge" : "vert"}
        />
        <CarteStatistique
          titre="Commandes du Jour"
          valeur={commandesDuJour}
          icone={ShoppingCart}
          couleur="violet"
        />
        <CarteStatistique
          titre="Top Produit"
          valeur={topProduit?.nom || "—"}
          icone={Package}
          couleur="jaune"
        />
        <CarteStatistique
          titre="Top Vendeur"
          valeur={topVendeur?.nom_complet || "—"}
          icone={Users}
          couleur="indigo"
        />
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