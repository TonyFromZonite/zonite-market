import React from "react";
import { AlertTriangle } from "lucide-react";

export default function StockCritique({ produits }) {
  const critique = produits
    .filter(p => p.statut !== 'supprime')
    .filter(p => (p.stock_actuel || 0) <= (p.seuil_alerte || 5));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h3 className="text-sm font-semibold text-slate-900">Stock Critique</h3>
        {critique.length > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {critique.length}
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {critique.length === 0 && (
          <p className="text-sm text-emerald-600 text-center py-4">Tous les stocks sont OK</p>
        )}
        {critique.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-100">
            <div>
              <p className="text-sm font-medium text-slate-900">{p.nom}</p>
              <p className="text-xs text-slate-500">Réf: {p.reference}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-600">{p.stock_actuel || 0}</p>
              <p className="text-xs text-slate-500">/ {p.seuil_alerte || 5} min</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}