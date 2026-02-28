import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function CarteStatistique({ titre, valeur, icone: Icone, couleur, tendance }) {
  const couleurs = {
    bleu: "bg-blue-50 text-blue-600",
    jaune: "bg-yellow-50 text-yellow-600",
    vert: "bg-emerald-50 text-emerald-600",
    rouge: "bg-red-50 text-red-600",
    violet: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow animate-slide-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{titre}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5">{valeur}</p>
          {tendance && (
            <div className="flex items-center gap-1 mt-2">
              {tendance > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={`text-xs font-medium ${tendance > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {tendance > 0 ? "+" : ""}{tendance}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${couleurs[couleur] || couleurs.bleu}`}>
          <Icone className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}