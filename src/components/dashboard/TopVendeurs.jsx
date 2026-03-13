import React from "react";
import { Users } from "lucide-react";

export default function TopVendeurs({ vendeurs }) {
  const top5 = [...vendeurs]
    .filter(v => v.statut === 'actif')
    .sort((a, b) => (b.chiffre_affaires_genere || 0) - (a.chiffre_affaires_genere || 0))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Vendeurs</h3>
      <div className="space-y-3">
        {top5.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Aucune donnée</p>
        )}
        {top5.map((vendeur, i) => (
          <div key={vendeur.id} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              i === 0 ? "bg-yellow-500" :
              i === 1 ? "bg-blue-500" :
              "bg-slate-400"
            }`}>
              {vendeur.nom_complet?.[0]?.toUpperCase() || "V"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{vendeur.nom_complet}</p>
              <p className="text-xs text-slate-500">{vendeur.nombre_ventes || 0} ventes</p>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {(vendeur.chiffre_affaires_genere || 0).toLocaleString("fr-FR")} FCFA
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}