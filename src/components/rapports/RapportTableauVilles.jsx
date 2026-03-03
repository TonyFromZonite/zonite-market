import React, { useMemo } from "react";
import { MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function RapportTableauVilles({ ventesFiltrees, cmdsFiltrees }) {
  const lignes = useMemo(() => {
    const map = {};

    ventesFiltrees.forEach(v => {
      const ville = v.client_adresse?.split(",")[0]?.trim() || "Non précisée";
      if (!map[ville]) map[ville] = { ville, nb: 0, ca: 0 };
      map[ville].nb += 1;
      map[ville].ca += v.montant_total || 0;
    });

    cmdsFiltrees.forEach(c => {
      const ville = c.client_ville || "Non précisée";
      if (!map[ville]) map[ville] = { ville, nb: 0, ca: 0 };
      map[ville].nb += 1;
      map[ville].ca += (c.prix_final_client || 0) * (c.quantite || 0);
    });

    return Object.values(map).sort((a, b) => b.ca - a.ca);
  }, [ventesFiltrees, cmdsFiltrees]);

  const top10 = lignes.slice(0, 10);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-blue-600">CA: {fmt(payload[0]?.value)}</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-rose-500" />
        <h3 className="font-semibold text-slate-900 text-sm">Répartition par Ville</h3>
      </div>
      {lignes.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Aucune donnée</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Graphique */}
          <div className="p-4 border-r border-slate-100">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="ville" tick={{ fontSize: 11, fill: "#64748b" }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ca" name="CA" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="text-left px-4 py-2 font-medium">Ville</th>
                  <th className="text-right px-4 py-2 font-medium">Commandes</th>
                  <th className="text-right px-4 py-2 font-medium">CA</th>
                  <th className="text-right px-4 py-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => {
                  const totalCA = lignes.reduce((s, x) => s + x.ca, 0);
                  const pct = totalCA > 0 ? ((l.ca / totalCA) * 100).toFixed(1) : 0;
                  return (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-800 flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {l.ville}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{l.nb}</td>
                      <td className="px-4 py-2.5 text-right text-slate-800 font-medium">{fmt(l.ca)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-slate-500">{pct}%</span>
                          <span className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden inline-block">
                            <span className="h-full bg-blue-400 rounded-full block" style={{ width: `${pct}%` }}></span>
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}