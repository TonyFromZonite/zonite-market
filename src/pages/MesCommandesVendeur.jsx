import React, { useState, useEffect } from "react";
import { getVendeurSession } from "@/components/useSessionGuard";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, ChevronLeft, ShoppingBag } from "lucide-react";
import BanniereKycPending from "@/components/BanniereKycPending";

const STATUTS = {
  en_attente_validation_admin: { label: "⏳ En attente validation", couleur: "bg-yellow-100 text-yellow-800" },
  validee_admin:               { label: "✓ Validée", couleur: "bg-blue-100 text-blue-800" },
  attribuee_livreur:           { label: "🚴 Livreur attribué", couleur: "bg-indigo-100 text-indigo-800" },
  en_livraison:                { label: "🚚 En livraison", couleur: "bg-purple-100 text-purple-800" },
  livree:                      { label: "✅ Livrée", couleur: "bg-emerald-100 text-emerald-800" },
  echec_livraison:             { label: "❌ Échec livraison", couleur: "bg-orange-100 text-orange-800" },
  annulee:                     { label: "🚫 Annulée", couleur: "bg-red-100 text-red-800" },
  // Rétrocompatibilité anciens statuts
  en_attente:                  { label: "⏳ En attente", couleur: "bg-yellow-100 text-yellow-800" },
  en_preparation:              { label: "En préparation", couleur: "bg-blue-100 text-blue-800" },
  echec:                       { label: "Échec", couleur: "bg-red-100 text-red-800" },
};

export default function MesCommandesVendeur() {
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const charger = async () => {
      const session = getVendeurSession();
      if (!session) {
        window.location.href = createPageUrl("Connexion");
        return;
      }
      const sellers = await base44.entities.Seller.filter({ email: session.email });
      if (sellers.length > 0) setCompteVendeur(sellers[0]);
    };
    charger();
  }, []);

  const { data: commandes = [], isLoading } = useQuery({
    queryKey: ["commandes_vendeur", compteVendeur?.id],
    queryFn: () => base44.entities.CommandeVendeur.filter({ vendeur_id: compteVendeur.id }, "-created_date", 100),
    enabled: !!compteVendeur?.id,
  });

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const commandesFiltrees = commandes.filter(c =>
    `${c.produit_nom} ${c.client_nom} ${c.client_ville}`.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {compteVendeur?.seller_status === "kyc_pending" && <BanniereKycPending />}
      <div className="bg-[#1a1f5e] text-white px-4 pb-4 sticky top-0 z-10" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">Mes commandes</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="pl-9 bg-white border-0"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : commandesFiltrees.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucune commande trouvée</p>
          </div>
        ) : (
          commandesFiltrees.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-semibold text-slate-900 truncate">{c.produit_nom}</p>
                  <p className="text-xs text-slate-500">{c.quantite} unité{c.quantite > 1 ? "s" : ""} • {formaterDate(c.created_date)}</p>
                </div>
                <Badge className={`${STATUTS[c.statut]?.couleur} text-xs border-0 flex-shrink-0`}>
                  {STATUTS[c.statut]?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Client</p>
                  <p className="text-sm font-medium text-slate-700">{c.client_nom} • {c.client_ville}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Votre commission</p>
                  <p className="font-bold text-emerald-600">{formater(c.commission_vendeur)}</p>
                </div>
              </div>
              {c.notes_admin && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                  📋 Admin : {c.notes_admin}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠" },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋" },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦" },
          { label: "Profil", page: "ProfilVendeur", icone: "👤" },
        ].map(({ label, page, icone }) => (
          <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-3 gap-1">
            <span className="text-xl">{icone}</span>
            <span className={`text-[10px] ${page === "MesCommandesVendeur" ? "text-[#1a1f5e] font-bold" : "text-slate-600"}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}