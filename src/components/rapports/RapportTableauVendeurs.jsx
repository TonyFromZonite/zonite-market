import React, { useMemo } from "react";
import { Users } from "lucide-react";

const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function RapportTableauVendeurs({ ventesFiltrees, cmdsFiltrees }) {
  const lignes = useMemo(() => {
    const map = {};

    // Ventes directes par vendeur
    ventesFiltrees.forEach(v => {
      const key = v.vendeur_id || v.vendeur_nom || "Direct";
      if (!map[key]) map[key] = { nom: v.vendeur_nom || "Vente Directe", qte: 0, ca: 0, commissions: 0, nb: 0 };
      map[key].qte += v.quantite || 0;
      map[key].ca += v.montant_total || 0;
      map[key].commissions += v.commission_vendeur || 0;
      map[key].nb += 1;
    });

    // Commandes vendeurs livrées
    cmdsFiltrees.forEach(c => {
      const key = c.vendeur_id || c.vendeur_email || "v_" + c.vendeur_nom;
      if (!map[key]) map[key] = { nom: c.vendeur_nom || c.vendeur_email || "Inconnu", qte: 0, ca: 0, commissions: 0, nb: 0 };
      const ca = (c.prix_final_client || 0) * (c.quantite || 0);
      map[key].qte += c.quantite || 0;
      map[key].ca += ca;
      map[key].commissions += c.commission_vendeur || 0;
      map[key].nb += 1;
    });

    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 10);
  }, [ventesFiltrees, cmdsFiltrees]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <Users className="w-4 h-4 text-purple-500" />
        <h3 className="font-semibold text-slate-900 text-sm">Top Vendeurs (par CA)</h3>
      </div>
      {lignes.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Aucune donnée</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-2 font-medium">Vendeur</th>
                <th className="text-right px-4 py-2 font-medium">Ventes</th>
                <th className="text-right px-4 py-2 font-medium">CA</th>
                <th className="text-right px-4 py-2 font-medium">Commissions</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    <span className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                        i === 0 ? "bg-yellow-100 text-yellow-700" :
                        i === 1 ? "bg-slate-200 text-slate-600" :
                        i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                      }`}>{l.nom.charAt(0).toUpperCase()}</span>
                      <span className="truncate max-w-[120px]">{l.nom}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{l.nb}</td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-medium">{fmt(l.ca)}</td>
                  <td className="px-4 py-2.5 text-right text-orange-600 font-semibold">{fmt(l.commissions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}