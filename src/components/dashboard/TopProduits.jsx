import React from "react";
import { Package } from "lucide-react";

export default function TopProduits({ produits }) {
  const top5 = [...produits]
    .filter(p => p.statut !== 'supprime')
    .sort((a, b) => (b.total_vendu || 0) - (a.total_vendu || 0))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Produits</h3>
      <div className="space-y-3">
        {top5.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Aucune donnée</p>
        )}
        {top5.map((produit, i) => (
          <div key={produit.id} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              i === 0 ? "bg-yellow-100 text-yellow-700" :
              i === 1 ? "bg-slate-100 text-slate-600" :
              "bg-slate-50 text-slate-500"
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{produit.nom}</p>
              <p className="text-xs text-slate-500">{produit.total_vendu || 0} vendus</p>
            </div>
            <Package className="w-4 h-4 text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
}