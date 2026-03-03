import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

function getGroupeKey(date, periodeJours) {
  if (periodeJours <= 30) return format(date, "dd/MM");
  if (periodeJours <= 90) return format(date, "'S'ww");
  return format(date, "MMM yy", { locale: fr });
}

export default function RapportGraphiquePeriode({ ventesFiltrees, cmdsFiltrees, periodeJours }) {
  const donnees = useMemo(() => {
    const map = {};

    const ajouter = (dateStr, caVal, margeVal, type) => {
      const date = new Date(dateStr);
      const key = getGroupeKey(date, periodeJours === 0 ? 365 : periodeJours);
      if (!map[key]) map[key] = { periode: key, caVentes: 0, caVendeurs: 0, marge: 0 };
      if (type === "vente") {
        map[key].caVentes += caVal;
        map[key].marge += margeVal;
      } else {
        map[key].caVendeurs += caVal;
        map[key].marge += margeVal;
      }
    };

    ventesFiltrees.forEach(v => {
      ajouter(v.date_vente || v.created_date, v.montant_total || 0, v.profit_zonite || 0, "vente");
    });

    cmdsFiltrees.forEach(c => {
      const ca = (c.prix_final_client || 0) * (c.quantite || 0);
      const marge = ca - (c.prix_gros || 0) * (c.quantite || 0) - (c.commission_vendeur || 0);
      ajouter(c.created_date, ca, marge, "vendeur");
    });

    return Object.values(map).sort((a, b) => a.periode.localeCompare(b.periode));
  }, [ventesFiltrees, cmdsFiltrees, periodeJours]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-slate-700 mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        Évolution du Chiffre d'Affaires & Marge
      </h3>
      {donnees.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Aucune donnée pour cette période</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={donnees} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periode" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="caVentes" name="CA Ventes Directes" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="caVendeurs" name="CA Ventes Vendeurs" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="marge" name="Marge Brute" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}