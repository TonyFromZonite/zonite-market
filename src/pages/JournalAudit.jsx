import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, Shield, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RapportsVentes from "./RapportsVentes";

const MODULES = {
  vente: { label: "Vente", couleur: "bg-blue-100 text-blue-700" },
  produit: { label: "Produit", couleur: "bg-emerald-100 text-emerald-700" },
  vendeur: { label: "Vendeur", couleur: "bg-purple-100 text-purple-700" },
  commande: { label: "Commande", couleur: "bg-indigo-100 text-indigo-700" },
  livraison: { label: "Livraison", couleur: "bg-orange-100 text-orange-700" },
  paiement: { label: "Paiement", couleur: "bg-yellow-100 text-yellow-700" },
  systeme: { label: "Système", couleur: "bg-slate-100 text-slate-700" },
};

const PAR_PAGE = 20;

const ONGLETS = [
  { key: "journal", label: "Journal d'Audit", icone: Shield },
  { key: "rapports", label: "Rapports Ventes", icone: TrendingUp },
];

export default function JournalAudit() {
  const [ongletActif, setOngletActif] = useState("journal");
  const [recherche, setRecherche] = useState("");
  const [filtreModule, setFiltreModule] = useState("tous");
  const [page, setPage] = useState(0);

  const { data: journaux = [], isLoading } = useQuery({
    queryKey: ["journal_audit"],
    queryFn: () => base44.entities.JournalAudit.list("-created_date", 500),
  });

  const journauxFiltres = journaux.filter((j) => {
    const texte = `${j.action} ${j.details} ${j.utilisateur}`.toLowerCase();
    const matchRecherche = !recherche || texte.includes(recherche.toLowerCase());
    const matchModule = filtreModule === "tous" || j.module === filtreModule;
    return matchRecherche && matchModule;
  });

  const totalPages = Math.ceil(journauxFiltres.length / PAR_PAGE);
  const journauxPage = journauxFiltres.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);

  const formaterDate = (d) =>
    d ? new Date(d).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

  if (isLoading) {
    return <div className="space-y-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200">
        {ONGLETS.map(({ key, label, icone: Icone }) => (
          <button
            key={key}
            onClick={() => setOngletActif(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${ongletActif === key ? "border-[#1a1f5e] text-[#1a1f5e]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Icone className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {ongletActif === "rapports" && <RapportsVentes />}
      {ongletActif === "journal" && (
      <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher dans le journal..."
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={filtreModule} onValueChange={(v) => { setFiltreModule(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les modules</SelectItem>
            {Object.entries(MODULES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead>Utilisateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journauxPage.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Aucune entrée trouvée
                  </TableCell>
                </TableRow>
              )}
              {journauxPage.map((j) => (
                <TableRow key={j.id} className="hover:bg-slate-50">
                  <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                    {formaterDate(j.created_date)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${MODULES[j.module]?.couleur || "bg-slate-100 text-slate-600"}`}>
                      {MODULES[j.module]?.label || j.module}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{j.action}</TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">{j.details}</TableCell>
                  <TableCell className="text-sm text-slate-500">{j.utilisateur || j.created_by || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">{journauxFiltres.length} entrée(s)</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}