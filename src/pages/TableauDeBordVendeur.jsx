import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, createPageUrl } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShoppingCart, DollarSign, Clock, ChevronLeft } from "lucide-react";

const COLORS = ["#1a1f5e", "#F5C518", "#10b981", "#f59e0b", "#ef4444"];

export default function TableauDeBordVendeur() {
  const [vendeur, setVendeur] = useState(null);

  useEffect(() => {
    const chargerVendeur = async () => {
      const user = await base44.auth.me();
      if (user) {
        const comptes = await base44.entities.CompteVendeur.filter({ user_email: user.email });
        if (comptes.length > 0) setVendeur(comptes[0]);
      }
    };
    chargerVendeur();
  }, []);

  // Récupérer les commandes du vendeur
  const { data: commandes = [], isLoading: chargement } = useQuery({
    queryKey: ["commandes_vendeur", vendeur?.id],
    queryFn: () => vendeur ? base44.entities.CommandeVendeur.filter({ vendeur_id: vendeur.id }) : [],
    enabled: !!vendeur,
  });

  // Récupérer tous les produits pour les tendances
  const { data: produits = [] } = useQuery({
    queryKey: ["produits"],
    queryFn: () => base44.entities.Produit.list(),
  });

  if (!vendeur && !chargement) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-600">Impossible de charger vos données</p>
      </div>
    );
  }

  // Calculs des métriques
  const commandesLivrees = commandes.filter(c => c.statut === "livree");
  const commandesEnAttente = commandes.filter(c => c.statut === "en_attente_validation_admin" || c.statut === "validee_admin" || c.statut === "attribuee_livreur" || c.statut === "en_livraison");
  const totalVentes = commandes.length;
  const revenusTotal = commandesLivrees.reduce((sum, c) => sum + (c.commission_vendeur || 0), 0);

  // Grouper les commandes par date pour la tendance
  const tendanceVentes = {};
  commandes.forEach(c => {
    const date = new Date(c.created_date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
    tendanceVentes[date] = (tendanceVentes[date] || 0) + 1;
  });
  const donneesTendance = Object.entries(tendanceVentes).map(([date, count]) => ({ date, commandes: count })).slice(-7);

  // Compter les commandes par produit
  const commandeParProduit = {};
  commandes.forEach(c => {
    const clé = c.produit_nom || "Sans nom";
    commandeParProduit[clé] = (commandeParProduit[clé] || 0) + c.quantite;
  });
  const donneesProduits = Object.entries(commandeParProduit)
    .map(([nom, quantite]) => ({ name: nom, quantite }))
    .sort((a, b) => b.quantite - a.quantite)
    .slice(0, 5);

  // Distribution par statut
  const statusCount = {};
  commandes.forEach(c => {
    statusCount[c.statut] = (statusCount[c.statut] || 0) + 1;
  });
  const donneesStatus = Object.entries(statusCount).map(([statut, count]) => ({ name: statut, value: count }));

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 py-5 sticky top-0 z-10" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">Tableau de Bord</h1>
        </div>
        <p className="text-sm text-slate-300">{vendeur?.nom_complet}</p>
      </div>

      <div className="p-4 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Ventes</p>
                <p className="text-2xl font-bold text-[#1a1f5e]">{totalVentes}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-[#F5C518] opacity-60" />
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Revenus</p>
                <p className="text-lg font-bold text-emerald-600">{formater(revenusTotal)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">En Attente</p>
                <p className="text-2xl font-bold text-orange-600">{commandesEnAttente.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-60" />
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Solde Actuel</p>
                <p className="text-lg font-bold text-[#1a1f5e]">{formater(vendeur?.solde_commission || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#1a1f5e] opacity-60" />
            </div>
          </Card>
        </div>

        {/* Graphique Tendance */}
        {donneesTendance.length > 0 && (
          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Tendance (7 derniers jours)</h3>
            {chargement ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={donneesTendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="commandes" stroke="#1a1f5e" strokeWidth={2} dot={{ fill: "#F5C518", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {/* Top Produits */}
        {donneesProduits.length > 0 && (
          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Top 5 Produits</h3>
            {chargement ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={donneesProduits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Bar dataKey="quantite" fill="#F5C518" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {/* Distribution par Statut */}
        {donneesStatus.length > 0 && (
          <Card className="p-4 bg-white rounded-2xl shadow-sm border-0">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Distribution Statuts</h3>
            {chargement ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donneesStatus} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name.slice(0, 10)}: ${entry.value}`} outerRadius={60} fill="#8884d8" dataKey="value">
                    {donneesStatus.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠" },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋" },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦" },
          { label: "Dashboard", page: "TableauDeBordVendeur", icone: "📊" },
          { label: "Profil", page: "ProfilVendeur", icone: "👤" },
        ].map(({ label, page, icone }) => (
          <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-3 gap-1">
            <span className="text-lg">{icone}</span>
            <span className={`text-[9px] ${page === "TableauDeBordVendeur" ? "text-[#1a1f5e] font-bold" : "text-slate-600"}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}