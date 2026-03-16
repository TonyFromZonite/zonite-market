import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Package, ExternalLink, ChevronLeft, PlayCircle } from "lucide-react";
import { getVendeurSession } from "@/components/useSessionGuard";
import BlocageKycPending from "@/components/BlocageKycPending";

export default function CatalogueVendeur() {
  const [recherche, setRecherche] = useState("");
  const [compteVendeur, setCompteVendeur] = useState(null);

  useEffect(() => {
    const charger = async () => {
      const session = getVendeurSession();
      if (!session) return;
      const sellers = await base44.entities.Seller.filter({ email: session.email });
      if (sellers.length > 0) setCompteVendeur(sellers[0]);
    };
    charger();
  }, []);

  const { data: produits = [], isLoading } = useQuery({
    queryKey: ["produits_catalogue"],
    queryFn: () => base44.entities.Produit.filter({ statut: "actif" }),
  });

  // Blocage doux si KYC en attente
  if (compteVendeur && compteVendeur.seller_status === "kyc_pending") {
    return <BlocageKycPending titre="Catalogue Produits" />;
  }

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  const produitsFiltres = produits.filter(p =>
    `${p.nom} ${p.description || ""} ${p.categorie_nom || ""}`.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 pb-4 sticky top-0 z-10" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">Catalogue Produits</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="pl-9 bg-white border-0"
          />
        </div>
      </div>

      {/* Bannière bleue si catalogue non débloqué */}
      {compteVendeur && compteVendeur.seller_status === "active_seller" && !compteVendeur.catalogue_debloque && (
        <div className="bg-blue-50 border-b-2 border-blue-300 px-4 py-4 flex items-start gap-3">
          <PlayCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-blue-800 font-bold text-sm">🎓 Déverrouillez votre catalogue</p>
            <p className="text-blue-700 text-xs mt-0.5 mb-2">
              Visionnez la vidéo de formation ZONITE pour accéder à tous nos produits.
            </p>
            <Link to={createPageUrl("VideoFormation")}>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
                ▶ Voir la formation
              </button>
            </Link>
          </div>
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : produitsFiltres.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucun produit disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {produitsFiltres.map(p => {
              const stockDispo = Math.max(0, (p.stock_global || 0) - (p.stock_reserve || 0));
              const stockOk = stockDispo > 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.nom} className="w-28 h-28 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-28 h-28 bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="p-3 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight">{p.nom}</h3>
                        <Badge className={`text-xs flex-shrink-0 ${stockOk ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} border-0`}>
                          {stockOk ? "Dispo" : "Rupture"}
                        </Badge>
                      </div>
                      {p.categorie_nom && <p className="text-xs text-slate-400 mt-0.5">{p.categorie_nom}</p>}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Prix de gros</p>
                          <p className="font-bold text-slate-900 text-sm">{formater(p.prix_gros)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Votre marge</p>
                          <p className="font-bold text-emerald-600 text-sm">Libre ≥ prix gros</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {p.lien_telegram && (
                    <a href={p.lien_telegram} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold border-t border-blue-400 hover:shadow-lg transition-shadow">
                      <ExternalLink className="w-4 h-4" />
                      📸 Voir images & vidéos Telegram
                    </a>
                  )}
                  {stockOk && (
                    <Link to={`${createPageUrl("NouvelleCommandeVendeur")}?produit_id=${p.id}`}>
                      <div className="px-4 py-2.5 bg-[#F5C518] text-[#1a1f5e] text-xs font-bold text-center">
                        Commander ce produit →
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
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
            <span className={`text-[10px] ${page === "CatalogueVendeur" ? "text-[#1a1f5e] font-bold" : "text-slate-600"}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}