import React, { useMemo } from "react";
import { Package } from "lucide-react";

const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function RapportTableauProduits({ ventesFiltrees, cmdsFiltrees, produits }) {
  const lignes = useMemo(() => {
    const map = {};

    ventesFiltrees.forEach(v => {
      const key = v.produit_id;
      if (!map[key]) map[key] = { nom: v.produit_nom || "Inconnu", qte: 0, ca: 0, marge: 0 };
      map[key].qte += v.quantite || 0;
      map[key].ca += v.montant_total || 0;
      map[key].marge += v.profit_zonite || 0;
    });

    cmdsFiltrees.forEach(c => {
      const key = c.produit_id;
      if (!map[key]) {
        const p = produits.find(p => p.id === key);
        map[key] = { nom: c.produit_nom || p?.nom || "Inconnu", qte: 0, ca: 0, marge: 0 };
      }
      const ca = (c.prix_final_client || 0) * (c.quantite || 0);
      const marge = ca - (c.prix_gros || 0) * (c.quantite || 0) - (c.commission_vendeur || 0);
      map[key].qte += c.quantite || 0;
      map[key].ca += ca;
      map[key].marge += marge;
    });

    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 10);
  }, [ventesFiltrees, cmdsFiltrees, produits]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <Package className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-slate-900 text-sm">Top Produits (par CA)</h3>
      </div>
      {lignes.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Aucune donnée</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-2 font-medium">Produit</th>
                <th className="text-right px-4 py-2 font-medium">Qté</th>
                <th className="text-right px-4 py-2 font-medium">CA</th>
                <th className="text-right px-4 py-2 font-medium">Marge</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-800 truncate max-w-[140px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                        i === 0 ? "bg-yellow-100 text-yellow-700" :
                        i === 1 ? "bg-slate-200 text-slate-600" :
                        i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                      }`}>{i + 1}</span>
                      {l.nom}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{l.qte}</td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-medium">{fmt(l.ca)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${l.marge >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(l.marge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}