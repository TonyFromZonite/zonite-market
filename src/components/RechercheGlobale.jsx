import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Search, X, Package, ShoppingCart, Users, ClipboardList, Loader2 } from "lucide-react";

const TYPES = [
  { key: "produits",   label: "Produit",   icone: Package,       couleur: "text-blue-600 bg-blue-50",  page: "Produits" },
  { key: "ventes",     label: "Vente",     icone: ShoppingCart,  couleur: "text-green-600 bg-green-50", page: "Commandes" },
  { key: "commandes",  label: "Commande",  icone: ClipboardList, couleur: "text-orange-600 bg-orange-50", page: "CommandesVendeurs" },
  { key: "vendeurs",   label: "Vendeur",   icone: Users,         couleur: "text-purple-600 bg-purple-50", page: "Vendeurs" },
];

export default function RechercheGlobale() {
  const [ouvert, setOuvert] = useState(false);
  const [query, setQuery] = useState("");
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [selectionne, setSelectionne] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Raccourci clavier Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOuvert(true);
      }
      if (e.key === "Escape") setOuvert(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (ouvert) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResultats([]); setSelectionne(0); }
  }, [ouvert]);

  useEffect(() => {
    if (query.trim().length < 2) { setResultats([]); return; }
    const timer = setTimeout(() => chercher(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const chercher = async (q) => {
    setChargement(true);
    const ql = q.toLowerCase();
    try {
      const [produits, ventes, commandes, vendeurs] = await Promise.all([
        base44.entities.Produit.list("-created_date", 100),
        base44.entities.Vente.list("-created_date", 100),
        base44.entities.CommandeVendeur.list("-created_date", 100),
        base44.entities.Vendeur.list("-created_date", 100),
      ]);

      const res = [];

      produits.filter(p =>
        p.nom?.toLowerCase().includes(ql) ||
        p.reference?.toLowerCase().includes(ql) ||
        p.categorie_nom?.toLowerCase().includes(ql)
      ).slice(0, 4).forEach(p => res.push({
        type: "produits", label: p.nom, sous: `Réf: ${p.reference || "—"} · ${p.categorie_nom || ""}`,
        id: p.id,
      }));

      ventes.filter(v =>
        v.produit_nom?.toLowerCase().includes(ql) ||
        v.client_nom?.toLowerCase().includes(ql) ||
        v.vendeur_nom?.toLowerCase().includes(ql) ||
        v.id?.toLowerCase().includes(ql)
      ).slice(0, 4).forEach(v => res.push({
        type: "ventes", label: v.produit_nom || "Vente", sous: `Client: ${v.client_nom || "—"} · ${v.vendeur_nom || ""}`,
        id: v.id,
      }));

      commandes.filter(c =>
        c.produit_nom?.toLowerCase().includes(ql) ||
        c.client_nom?.toLowerCase().includes(ql) ||
        c.vendeur_nom?.toLowerCase().includes(ql) ||
        c.id?.toLowerCase().includes(ql)
      ).slice(0, 4).forEach(c => res.push({
        type: "commandes", label: c.produit_nom || "Commande", sous: `Client: ${c.client_nom || "—"} · ${c.vendeur_nom || ""}`,
        id: c.id,
      }));

      vendeurs.filter(v =>
        v.nom_complet?.toLowerCase().includes(ql) ||
        v.email?.toLowerCase().includes(ql) ||
        v.telephone?.includes(q)
      ).slice(0, 3).forEach(v => res.push({
        type: "vendeurs", label: v.nom_complet, sous: v.email || v.telephone || "",
        id: v.id,
      }));

      setResultats(res);
      setSelectionne(0);
    } finally {
      setChargement(false);
    }
  };

  const naviguerVers = (item) => {
    const type = TYPES.find(t => t.key === item.type);
    if (type) navigate(createPageUrl(type.page));
    setOuvert(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectionne(s => Math.min(s + 1, resultats.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectionne(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && resultats[selectionne]) naviguerVers(resultats[selectionne]);
  };

  return (
    <>
      {/* Bouton trigger dans le header */}
      <button
        onClick={() => setOuvert(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Rechercher...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-400">
          Ctrl K
        </kbd>
      </button>

      {/* Modal de recherche */}
      {ouvert && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" onClick={() => setOuvert(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              {chargement ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin flex-shrink-0" /> : <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />}
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher un produit, commande, vendeur, client..."
                className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Résultats */}
            {resultats.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-2">
                {resultats.map((item, i) => {
                  const type = TYPES.find(t => t.key === item.type);
                  const Icone = type?.icone || Search;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => naviguerVers(item)}
                        onMouseEnter={() => setSelectionne(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selectionne === i ? "bg-slate-50" : "hover:bg-slate-50"}`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${type?.couleur}`}>
                          <Icone className="w-3.5 h-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.label}</p>
                          <p className="text-xs text-slate-400 truncate">{item.sous}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${type?.couleur}`}>
                          {type?.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Aucun résultat */}
            {query.length >= 2 && !chargement && resultats.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                Aucun résultat pour « {query} »
              </div>
            )}

            {/* Aide */}
            {query.length < 2 && (
              <div className="px-4 py-4 text-xs text-slate-400 flex gap-4">
                <span>↑↓ Naviguer</span>
                <span>↵ Ouvrir</span>
                <span>Esc Fermer</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}