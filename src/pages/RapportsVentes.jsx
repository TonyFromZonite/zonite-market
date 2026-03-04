import React, { useState, useMemo } from "react";
import VentesVendeurTab from "@/components/rapports/VentesVendeurTab";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, ShoppingCart, Package, Users, MapPin, Download, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";

const PERIODES = [
  { label: "7 jours", valeur: 7 },
  { label: "30 jours", valeur: 30 },
  { label: "90 jours", valeur: 90 },
  { label: "1 an", valeur: 365 },
  { label: "Tout", valeur: 0 },
];

const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

function getGroupeKey(date, periodeJours) {
  if (periodeJours <= 30) return format(date, "dd/MM");
  if (periodeJours <= 90) return format(date, "'S'ww");
  return format(date, "MMM yy", { locale: fr });
}

// ── KPI Card ──
function KPICard({ titre, valeur, sous, icone: Icone, couleurBg, couleurTexte }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{titre}</p>
          <p className="text-xl font-bold text-slate-900 mt-1 truncate">{valeur}</p>
          {sous && <p className="text-xs text-slate-400 mt-1 truncate">{sous}</p>}
        </div>
        <div className={`w-10 h-10 ${couleurBg} rounded-xl flex items-center justify-center ml-3 flex-shrink-0`}>
          <Icone className={`w-5 h-5 ${couleurTexte}`} />
        </div>
      </div>
    </div>
  );
}

// ── Custom Tooltip ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
}

export default function RapportsVentes() {
  const [onglet, setOnglet] = useState("global");
  const [periodeJours, setPeriodeJours] = useState(30);
  const [exportEnCours, setExportEnCours] = useState(false);

  const exporterPDF = () => {
    setExportEnCours(true);
    const doc = new jsPDF();
    const periodeLabel = PERIODES.find(p => p.valeur === periodeJours)?.label || "";
    const dateStr = format(new Date(), "dd/MM/yyyy HH:mm");
    const bleu = [26, 31, 94];

    // En-tête
    doc.setFillColor(...bleu);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ZONITE - Rapport des Ventes", 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Période : ${periodeLabel}  |  Généré le ${dateStr}`, 14, 22);

    let y = 38;
    doc.setTextColor(0, 0, 0);

    // KPIs
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...bleu);
    doc.text("Indicateurs Clés", 14, y);
    y += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 6;

    const kpis = [
      ["CA Total", fmt(caTotal)],
      ["CA Ventes Directes", fmt(caVentes)],
      ["CA Vendeurs", fmt(caCmds)],
      ["Marge Brute", fmt(margeTotal)],
      ["Taux de Marge", `${tauxMarge}%`],
      ["Nb Transactions", `${nbTransactions}`],
      ["Panier Moyen", fmt(nbTransactions > 0 ? caTotal / nbTransactions : 0)],
    ];
    doc.setFontSize(10);
    kpis.forEach(([k, v], i) => {
      const x = i % 2 === 0 ? 14 : 110;
      if (i % 2 === 0 && i > 0) y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(k, x, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(v, x + 50, y);
    });
    y += 14;

    // Top Produits
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...bleu);
    doc.text("Top Produits", 14, y);
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("#", 14, y); doc.text("Produit", 22, y); doc.text("Qté", 120, y); doc.text("CA", 140, y); doc.text("Marge", 172, y);
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    topProduits.forEach((l, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}`, 14, y);
      doc.text(l.nom.substring(0, 40), 22, y);
      doc.text(`${l.qte}`, 120, y);
      doc.text(fmt(l.ca), 130, y);
      doc.setTextColor(l.marge >= 0 ? 16 : 220, l.marge >= 0 ? 185 : 53, l.marge >= 0 ? 129 : 69);
      doc.text(fmt(l.marge), 163, y);
      doc.setTextColor(0, 0, 0);
      y += 7;
    });
    y += 6;

    // Top Vendeurs
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...bleu);
    doc.text("Top Vendeurs", 14, y);
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("#", 14, y); doc.text("Vendeur", 22, y); doc.text("Ventes", 110, y); doc.text("CA", 135, y); doc.text("Commissions", 163, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    topVendeurs.forEach((l, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}`, 14, y);
      doc.text(l.nom.substring(0, 40), 22, y);
      doc.text(`${l.nb}`, 110, y);
      doc.text(fmt(l.ca), 125, y);
      doc.text(fmt(l.commissions), 163, y);
      y += 7;
    });
    y += 6;

    // Villes
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...bleu);
    doc.text("Répartition par Ville", 14, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Ville", 14, y); doc.text("Commandes", 90, y); doc.text("CA", 135, y); doc.text("%", 175, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    topVilles.forEach((l) => {
      if (y > 260) { doc.addPage(); y = 20; }
      const pct = totalCAVilles > 0 ? ((l.ca / totalCAVilles) * 100).toFixed(1) : 0;
      doc.text(l.ville.substring(0, 35), 14, y);
      doc.text(`${l.nb}`, 90, y);
      doc.text(fmt(l.ca), 125, y);
      doc.text(`${pct}%`, 175, y);
      y += 7;
    });

    // Pied de page
    const nbPages = doc.getNumberOfPages();
    for (let i = 1; i <= nbPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} / ${nbPages}  |  ZONITE Gestion`, 14, 290);
    }

    doc.save(`rapport_ventes_${periodeLabel}_${format(new Date(), "yyyyMMdd")}.pdf`);
    setExportEnCours(false);
  };

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

  const dateDebut = useMemo(() => {
    if (periodeJours === 0) return null;
    const d = new Date();
    d.setDate(d.getDate() - periodeJours);
    return d;
  }, [periodeJours]);

  const ventesFiltrees = useMemo(() => {
    const actives = ventes.filter(v => v.statut_commande !== "annulee" && v.statut_commande !== "retournee");
    if (!dateDebut) return actives;
    return actives.filter(v => new Date(v.date_vente || v.created_date) >= dateDebut);
  }, [ventes, dateDebut]);

  const cmdsFiltrees = useMemo(() => {
    const actives = commandesVendeurs.filter(c => c.statut === "livree");
    if (!dateDebut) return actives;
    return actives.filter(c => new Date(c.created_date) >= dateDebut);
  }, [commandesVendeurs, dateDebut]);

  // ── KPIs ──
  const caVentes = ventesFiltrees.reduce((s, v) => s + (v.montant_total || 0), 0);
  const margeVentes = ventesFiltrees.reduce((s, v) => s + (v.profit_zonite || 0), 0);
  const caCmds = cmdsFiltrees.reduce((s, c) => s + (c.prix_final_client || 0) * (c.quantite || 0), 0);
  const margeCmds = cmdsFiltrees.reduce((s, c) => {
    const ca = (c.prix_final_client || 0) * (c.quantite || 0);
    return s + ca - (c.prix_gros || 0) * (c.quantite || 0) - (c.commission_vendeur || 0);
  }, 0);
  const caTotal = caVentes + caCmds;
  const margeTotal = margeVentes + margeCmds;
  const tauxMarge = caTotal > 0 ? ((margeTotal / caTotal) * 100).toFixed(1) : 0;
  const nbTransactions = ventesFiltrees.length + cmdsFiltrees.length;

  // ── Graphique période ──
  const donneesGraphique = useMemo(() => {
    const map = {};
    const pj = periodeJours === 0 ? 365 : periodeJours;
    const ajouter = (dateStr, caVal, margeVal, type) => {
      const date = new Date(dateStr);
      const key = getGroupeKey(date, pj);
      if (!map[key]) map[key] = { periode: key, caVentes: 0, caVendeurs: 0, marge: 0 };
      if (type === "vente") { map[key].caVentes += caVal; map[key].marge += margeVal; }
      else { map[key].caVendeurs += caVal; map[key].marge += margeVal; }
    };
    ventesFiltrees.forEach(v => ajouter(v.date_vente || v.created_date, v.montant_total || 0, v.profit_zonite || 0, "vente"));
    cmdsFiltrees.forEach(c => {
      const ca = (c.prix_final_client || 0) * (c.quantite || 0);
      const marge = ca - (c.prix_gros || 0) * (c.quantite || 0) - (c.commission_vendeur || 0);
      ajouter(c.created_date, ca, marge, "vendeur");
    });
    return Object.values(map).sort((a, b) => a.periode.localeCompare(b.periode));
  }, [ventesFiltrees, cmdsFiltrees, periodeJours]);

  // ── Top Produits ──
  const topProduits = useMemo(() => {
    const map = {};
    ventesFiltrees.forEach(v => {
      const key = v.produit_id || v.produit_nom;
      if (!map[key]) map[key] = { nom: v.produit_nom || "Inconnu", qte: 0, ca: 0, marge: 0 };
      map[key].qte += v.quantite || 0;
      map[key].ca += v.montant_total || 0;
      map[key].marge += v.profit_zonite || 0;
    });
    cmdsFiltrees.forEach(c => {
      const key = c.produit_id || c.produit_nom;
      if (!map[key]) map[key] = { nom: c.produit_nom || "Inconnu", qte: 0, ca: 0, marge: 0 };
      const ca = (c.prix_final_client || 0) * (c.quantite || 0);
      map[key].qte += c.quantite || 0;
      map[key].ca += ca;
      map[key].marge += ca - (c.prix_gros || 0) * (c.quantite || 0) - (c.commission_vendeur || 0);
    });
    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 10);
  }, [ventesFiltrees, cmdsFiltrees]);

  // ── Top Vendeurs ──
  const topVendeurs = useMemo(() => {
    const map = {};
    ventesFiltrees.forEach(v => {
      const key = v.vendeur_id || v.vendeur_nom || "direct";
      if (!map[key]) map[key] = { nom: v.vendeur_nom || "Vente Directe", nb: 0, ca: 0, commissions: 0 };
      map[key].nb += 1; map[key].ca += v.montant_total || 0; map[key].commissions += v.commission_vendeur || 0;
    });
    cmdsFiltrees.forEach(c => {
      const key = c.vendeur_id || c.vendeur_email || c.vendeur_nom;
      if (!map[key]) map[key] = { nom: c.vendeur_nom || c.vendeur_email || "Inconnu", nb: 0, ca: 0, commissions: 0 };
      map[key].nb += 1;
      map[key].ca += (c.prix_final_client || 0) * (c.quantite || 0);
      map[key].commissions += c.commission_vendeur || 0;
    });
    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 10);
  }, [ventesFiltrees, cmdsFiltrees]);

  // ── Top Villes ──
  const topVilles = useMemo(() => {
    const map = {};
    ventesFiltrees.forEach(v => {
      const ville = v.client_adresse?.split(",")[0]?.trim() || "Non précisée";
      if (!map[ville]) map[ville] = { ville, nb: 0, ca: 0 };
      map[ville].nb += 1; map[ville].ca += v.montant_total || 0;
    });
    cmdsFiltrees.forEach(c => {
      const ville = c.client_ville || "Non précisée";
      if (!map[ville]) map[ville] = { ville, nb: 0, ca: 0 };
      map[ville].nb += 1; map[ville].ca += (c.prix_final_client || 0) * (c.quantite || 0);
    });
    return Object.values(map).sort((a, b) => b.ca - a.ca);
  }, [ventesFiltrees, cmdsFiltrees]);

  const totalCAVilles = topVilles.reduce((s, v) => s + v.ca, 0);
  const badgeRank = (i) => i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500";

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
      {/* Onglets */}
      <div className="flex gap-2 border-b border-slate-200">
        {[{ id: "global", label: "Vue Globale" }, { id: "vendeurs", label: "Ventes Vendeurs" }].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${onglet === o.id ? "border-[#1a1f5e] text-[#1a1f5e]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "vendeurs" && <VentesVendeurTab />}

      {onglet === "global" && <div className="space-y-6">
      {/* Header + Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">Rapports des Ventes</h2>
          <p className="text-xs md:text-sm text-slate-500">Analyse détaillée des performances commerciales</p>
        </div>
        <div className="flex gap-1.5 md:gap-2 flex-wrap items-center">
          {PERIODES.map(p => (
            <Button key={p.valeur} size="sm" variant={periodeJours === p.valeur ? "default" : "outline"}
              onClick={() => setPeriodeJours(p.valeur)}
              className={periodeJours === p.valeur ? "bg-[#1a1f5e] text-white" : ""}>
              {p.label}
            </Button>
          ))}
          <Button size="sm" onClick={exporterPDF} disabled={exportEnCours} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 ml-2">
            {exportEnCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard titre="Chiffre d'Affaires Total" valeur={fmt(caTotal)} sous={`Direct: ${fmt(caVentes)} | Vendeurs: ${fmt(caCmds)}`} icone={DollarSign} couleurBg="bg-blue-50" couleurTexte="text-blue-600" />
        <KPICard titre="Marge Brute Globale" valeur={fmt(margeTotal)} sous={`Taux: ${tauxMarge}%`} icone={TrendingUp} couleurBg="bg-emerald-50" couleurTexte="text-emerald-600" />
        <KPICard titre="Transactions" valeur={nbTransactions} sous={`${ventesFiltrees.length} directes • ${cmdsFiltrees.length} vendeurs`} icone={ShoppingCart} couleurBg="bg-purple-50" couleurTexte="text-purple-600" />
        <KPICard titre="Panier Moyen" valeur={fmt(nbTransactions > 0 ? caTotal / nbTransactions : 0)} sous="Par transaction" icone={Package} couleurBg="bg-yellow-50" couleurTexte="text-yellow-600" />
      </div>

      {/* Graphique évolution */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Évolution du Chiffre d'Affaires & Marge
        </h3>
        {donneesGraphique.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Aucune donnée pour cette période</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={donneesGraphique} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="periode" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="caVentes" name="CA Ventes Directes" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="caVendeurs" name="CA Ventes Vendeurs" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="marge" name="Marge Brute" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Produits + Top Vendeurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produits */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-900 text-sm">Top Produits (par CA)</h3>
          </div>
          {topProduits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Aucune donnée</div>
          ) : (
            <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm">
                        <thead><tr className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase">
                          <th className="text-left px-2 md:px-4 py-2 font-medium">Produit</th>
                          <th className="text-right px-2 md:px-4 py-2 font-medium">Qté</th>
                          <th className="text-right px-2 md:px-4 py-2 font-medium">CA</th>
                          <th className="text-right px-2 md:px-4 py-2 font-medium">Marge</th>
                        </tr></thead>
                <tbody>
                  {topProduits.map((l, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-2 md:px-4 py-2.5 font-medium text-slate-800">
                        <span className="flex items-center gap-1">
                          <span className={`w-5 h-5 rounded-full text-[9px] md:text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${badgeRank(i)}`}>{i + 1}</span>
                          <span className="truncate max-w-[80px] md:max-w-[130px] text-[11px] md:text-sm">{l.nom}</span>
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-2.5 text-right text-slate-600 text-xs md:text-sm">{l.qte}</td>
                      <td className="px-2 md:px-4 py-2.5 text-right font-medium text-slate-800 text-xs md:text-sm">{fmt(l.ca)}</td>
                      <td className={`px-2 md:px-4 py-2.5 text-right font-semibold text-xs md:text-sm ${l.marge >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(l.marge)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Vendeurs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-slate-900 text-sm">Top Vendeurs (par CA)</h3>
          </div>
          {topVendeurs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Aucune donnée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead><tr className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase">
                  <th className="text-left px-2 md:px-4 py-2 font-medium">Vendeur</th>
                  <th className="text-right px-2 md:px-4 py-2 font-medium">Ventes</th>
                  <th className="text-right px-2 md:px-4 py-2 font-medium">CA</th>
                  <th className="text-right px-2 md:px-4 py-2 font-medium">Commissions</th>
                </tr></thead>
                <tbody>
                  {topVendeurs.map((l, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-2 md:px-4 py-2.5 font-medium text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-6 h-6 md:w-7 md:h-7 rounded-full text-[9px] md:text-xs font-bold flex items-center justify-center flex-shrink-0 ${badgeRank(i)}`}>{l.nom.charAt(0).toUpperCase()}</span>
                          <span className="truncate max-w-[80px] md:max-w-[120px] text-xs md:text-sm">{l.nom}</span>
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-2.5 text-right text-slate-600 text-xs md:text-sm">{l.nb}</td>
                      <td className="px-2 md:px-4 py-2.5 text-right font-medium text-slate-800 text-xs md:text-sm">{fmt(l.ca)}</td>
                      <td className="px-2 md:px-4 py-2.5 text-right font-semibold text-orange-600 text-xs md:text-sm">{fmt(l.commissions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Répartition par Ville */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Répartition par Ville</h3>
        </div>
        {topVilles.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Aucune donnée</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-4 border-r border-slate-100">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topVilles.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="ville" tick={{ fontSize: 11, fill: "#64748b" }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ca" name="CA" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead><tr className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase">
                  <th className="text-left px-2 md:px-4 py-2 font-medium">Ville</th>
                  <th className="text-right px-2 md:px-4 py-2 font-medium">Cmdes</th>
                  <th className="text-right px-2 md:px-4 py-2 font-medium">CA</th>
                  <th className="text-right px-2 md:px-4 py-2 font-medium">%</th>
                </tr></thead>
                <tbody>
                  {topVilles.map((l, i) => {
                    const pct = totalCAVilles > 0 ? ((l.ca / totalCAVilles) * 100).toFixed(1) : 0;
                    return (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-2 md:px-4 py-2.5 font-medium text-slate-800">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 hidden sm:inline" />
                            <span className="truncate max-w-[80px] md:max-w-none text-xs md:text-sm">{l.ville}</span>
                          </span>
                        </td>
                        <td className="px-2 md:px-4 py-2.5 text-right text-slate-600 text-xs md:text-sm">{l.nb}</td>
                        <td className="px-2 md:px-4 py-2.5 text-right font-medium text-slate-800 text-xs md:text-sm">{fmt(l.ca)}</td>
                        <td className="px-2 md:px-4 py-2.5 text-right">
                          <span className="flex items-center justify-end gap-1">
                            <span className="text-slate-500 text-xs">{pct}%</span>
                            <span className="w-8 md:w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden inline-block">
                              <span className="h-full bg-blue-400 rounded-full block" style={{ width: `${pct}%` }}></span>
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </div>}
    </div>
  );
}