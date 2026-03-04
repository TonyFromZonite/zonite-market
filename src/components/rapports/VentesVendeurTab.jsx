import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";

const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const PERIODES = [
  { label: "7 jours", valeur: 7 },
  { label: "30 jours", valeur: 30 },
  { label: "90 jours", valeur: 90 },
  { label: "1 an", valeur: 365 },
  { label: "Tout", valeur: 0 },
];

export default function VentesVendeurTab() {
  const [periodeJours, setPeriodeJours] = useState(30);
  const [filtreVendeur, setFiltreVendeur] = useState("tous");
  const [recherche, setRecherche] = useState("");

  const { data: commandes = [], isLoading } = useQuery({
    queryKey: ["commandes_vendeurs_ventes_tab"],
    queryFn: () => base44.entities.CommandeVendeur.list("-created_date", 2000),
  });

  // Commandes livrées uniquement
  const commandesLivrees = useMemo(() => commandes.filter(c => c.statut === "livree"), [commandes]);

  // Filtrage par période
  const dateDebut = useMemo(() => {
    if (periodeJours === 0) return null;
    const d = new Date();
    d.setDate(d.getDate() - periodeJours);
    return d;
  }, [periodeJours]);

  const commandesFiltrees = useMemo(() => {
    let result = commandesLivrees;
    if (dateDebut) result = result.filter(c => new Date(c.created_date) >= dateDebut);
    if (filtreVendeur !== "tous") result = result.filter(c => c.vendeur_id === filtreVendeur || c.vendeur_nom === filtreVendeur);
    if (recherche) {
      const q = recherche.toLowerCase();
      result = result.filter(c =>
        c.produit_nom?.toLowerCase().includes(q) ||
        c.vendeur_nom?.toLowerCase().includes(q) ||
        c.client_nom?.toLowerCase().includes(q) ||
        c.client_ville?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [commandesLivrees, dateDebut, filtreVendeur, recherche]);

  // Liste vendeurs uniques
  const vendeurs = useMemo(() => {
    const map = {};
    commandesLivrees.forEach(c => { if (c.vendeur_id || c.vendeur_nom) map[c.vendeur_id || c.vendeur_nom] = c.vendeur_nom || c.vendeur_id; });
    return Object.entries(map).map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [commandesLivrees]);

  // KPIs
  const caTotal = commandesFiltrees.reduce((s, c) => s + (c.prix_final_client || 0) * (c.quantite || 0), 0);
  const commissionsTotal = commandesFiltrees.reduce((s, c) => s + (c.commission_vendeur || 0), 0);
  const nbCommandes = commandesFiltrees.length;

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 items-start md:items-center">
        <div className="flex gap-1 md:gap-1.5 flex-wrap">
          {PERIODES.map(p => (
            <button key={p.valeur}
              onClick={() => setPeriodeJours(p.valeur)}
              className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-colors ${periodeJours === p.valeur ? "bg-[#1a1f5e] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <Select value={filtreVendeur} onValueChange={setFiltreVendeur}>
          <SelectTrigger className="w-full md:w-48 h-9 text-xs md:text-sm"><SelectValue placeholder="Tous les vendeurs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les vendeurs</SelectItem>
            {vendeurs.map(v => <SelectItem key={v.id} value={v.id}>{v.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 w-full md:w-auto min-w-0 md:min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher..." className="pl-8 h-9 text-xs md:text-sm w-full" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-blue-600" /></div>
            <p className="text-[11px] md:text-xs text-slate-500 font-medium truncate">Commandes</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{nbCommandes}</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center"><DollarSign className="w-4 h-4 text-purple-600" /></div>
            <p className="text-[11px] md:text-xs text-slate-500 font-medium truncate">CA Vendeurs</p>
          </div>
          <p className="text-base md:text-xl font-bold text-slate-900 truncate">{fmt(caTotal)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-yellow-600" /></div>
            <p className="text-[11px] md:text-xs text-slate-500 font-medium truncate">Commissions totales</p>
          </div>
          <p className="text-base md:text-xl font-bold text-yellow-600 truncate">{fmt(commissionsTotal)}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {commandesFiltrees.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Aucune commande livrée pour cette période</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase border-b border-slate-100">
                  <th className="text-left px-2 md:px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-2 md:px-4 py-3 font-medium">Vendeur</th>
                  <th className="text-left px-2 md:px-4 py-3 font-medium">Produit</th>
                  <th className="text-right px-2 md:px-4 py-3 font-medium">Qté</th>
                  <th className="text-right px-2 md:px-4 py-3 font-medium hidden sm:table-cell">Prix client</th>
                  <th className="text-right px-2 md:px-4 py-3 font-medium">CA</th>
                  <th className="text-right px-2 md:px-4 py-3 font-medium">Commission</th>
                  <th className="text-left px-2 md:px-4 py-3 font-medium hidden md:table-cell">Ville</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {commandesFiltrees.map((c) => {
                  const ca = (c.prix_final_client || 0) * (c.quantite || 0);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 md:px-4 py-3 text-slate-500 text-[11px] md:text-xs whitespace-nowrap">{fmtDate(c.created_date)}</td>
                      <td className="px-2 md:px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-[#1a1f5e] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                            {(c.vendeur_nom || "?").charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium text-slate-800 text-[11px] md:text-xs truncate max-w-[70px] md:max-w-[100px]">{c.vendeur_nom || "—"}</span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-3 text-slate-700 truncate max-w-[70px] md:max-w-[130px] text-[11px] md:text-sm">{c.produit_nom}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-600 text-xs md:text-sm">{c.quantite}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-700 text-xs md:text-sm hidden sm:table-cell">{fmt(c.prix_final_client)}</td>
                      <td className="px-2 md:px-4 py-3 text-right font-semibold text-slate-900 text-xs md:text-sm">{fmt(ca)}</td>
                      <td className="px-2 md:px-4 py-3 text-right">
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border font-semibold text-[10px] md:text-xs whitespace-nowrap">
                          {fmt(c.commission_vendeur)}
                        </Badge>
                      </td>
                      <td className="px-2 md:px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{c.client_ville || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-xs md:text-sm">
                  <td colSpan={5} className="px-2 md:px-4 py-3 text-slate-600 text-xs md:text-sm">Total ({nbCommandes} commandes)</td>
                  <td className="px-2 md:px-4 py-3 text-right text-slate-900 text-xs md:text-sm">{fmt(caTotal)}</td>
                  <td className="px-2 md:px-4 py-3 text-right text-yellow-700 text-xs md:text-sm">{fmt(commissionsTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}