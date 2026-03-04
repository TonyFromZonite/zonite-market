import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function GraphiqueVentes({ ventes }) {
  // Regrouper les ventes par jour (7 derniers jours)
  const derniersSeptJours = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const ventesJour = ventes.filter(v => {
      const dateVente = v.date_vente ? v.date_vente.split("T")[0] : v.created_date?.split("T")[0];
      return dateVente === dateStr;
    });
    const total = ventesJour.reduce((s, v) => s + (v.montant_total || 0), 0);
    derniersSeptJours.push({
      jour: date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
      montant: Math.round(total),
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Ventes – 7 derniers jours</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={derniersSeptJours}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              formatter={(val) => [`${val.toLocaleString("fr-FR")} FCFA`, "Montant"]}
            />
            <Bar dataKey="montant" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}