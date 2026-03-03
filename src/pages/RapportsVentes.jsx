import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Package, Users, MapPin, DollarSign, BarChart2 } from "lucide-react";
import RapportKPIs from "@/components/rapports/RapportKPIs";
import RapportGraphiquePeriode from "@/components/rapports/RapportGraphiquePeriode";
import RapportTableauProduits from "@/components/rapports/RapportTableauProduits";
import RapportTableauVendeurs from "@/components/rapports/RapportTableauVendeurs";
import RapportTableauVilles from "@/components/rapports/RapportTableauVilles";

const PERIODES = [
  { label: "7 jours", valeur: 7 },
  { label: "30 jours", valeur: 30 },
  { label: "90 jours", valeur: 90 },
  { label: "1 an", valeur: 365 },
  { label: "Tout", valeur: 0 },
];

export default function RapportsVentes() {
  const [periodeJours, setPeriodeJours] = useState(30);

  const { data: ventes = [], isLoading: chargVentes } = useQuery({
    queryKey: ["ventes_rapport"],
    queryFn: () => base44.entities.Vente.list("-created_date", 2000),
  });

  const { data: commandesVendeurs = [], isLoading: chargCmds } = useQuery({
    queryKey: ["commandes_vendeurs_rapport"],
    queryFn: () => base44.entities.CommandeVendeur.list("-created_date", 2000),
  });

  const { data: produits = [] } = useQuery({
    queryKey: ["produits_rapport"],
    queryFn: () => base44.entities.Produit.list(),
  });

  const isLoading = chargVentes || chargCmds;

  // Filtrer par période
  const dateDebut = useMemo(() => {
    if (periodeJours === 0) return null;
    const d = new Date();
    d.setDate(d.getDate() - periodeJours);
    return d;
  }, [periodeJours]);

  const ventesFiltrees = useMemo(() => {
    const actives = ventes.filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee");
    if (!dateDebut) return actives;
    return actives.filter(v => {
      const d = new Date(v.date_vente || v.created_date);
      return d >= dateDebut;
    });
  }, [ventes, dateDebut]);

  const cmdsFiltrees = useMemo(() => {
    const actives = commandesVendeurs.filter(c => c.statut === "livree");
    if (!dateDebut) return actives;
    return actives.filter(c => {
      const d = new Date(c.created_date);
      return d >= dateDebut;
    });
  }, [commandesVendeurs, dateDebut]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Filtre période */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rapports des Ventes</h2>
          <p className="text-sm text-slate-500">Analyse détaillée des performances commerciales</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIODES.map(p => (
            <Button
              key={p.valeur}
              size="sm"
              variant={periodeJours === p.valeur ? "default" : "outline"}
              onClick={() => setPeriodeJours(p.valeur)}
              className={periodeJours === p.valeur ? "bg-[#1a1f5e] text-white" : ""}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs globaux */}
      <RapportKPIs ventesFiltrees={ventesFiltrees} cmdsFiltrees={cmdsFiltrees} produits={produits} />

      {/* Graphique évolution dans le temps */}
      <RapportGraphiquePeriode ventesFiltrees={ventesFiltrees} cmdsFiltrees={cmdsFiltrees} periodeJours={periodeJours} />

      {/* Tableaux par produit, vendeur, ville */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RapportTableauProduits ventesFiltrees={ventesFiltrees} cmdsFiltrees={cmdsFiltrees} produits={produits} />
        <RapportTableauVendeurs ventesFiltrees={ventesFiltrees} cmdsFiltrees={cmdsFiltrees} />
      </div>

      <RapportTableauVilles ventesFiltrees={ventesFiltrees} cmdsFiltrees={cmdsFiltrees} />
    </div>
  );
}