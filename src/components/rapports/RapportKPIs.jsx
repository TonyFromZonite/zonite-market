import React from "react";
import { DollarSign, TrendingUp, ShoppingCart, Package } from "lucide-react";

const Carte = ({ titre, valeur, sous, icone: Icone, couleurBg, couleurTexte }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{titre}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{valeur}</p>
        {sous && <p className="text-xs text-slate-400 mt-1">{sous}</p>}
      </div>
      <div className={`w-10 h-10 ${couleurBg} rounded-xl flex items-center justify-center`}>
        <Icone className={`w-5 h-5 ${couleurTexte}`} />
      </div>
    </div>
  </div>
);

const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function RapportKPIs({ ventesFiltrees, cmdsFiltrees, produits }) {
  const caVentes = ventesFiltrees.reduce((s, v) => s + (v.montant_total || 0), 0);
  const margeVentes = ventesFiltrees.reduce((s, v) => s + (v.profit_zonite || 0), 0);

  // Pour les commandes vendeurs : CA = prix_final_client * quantite, marge = CA - prix_gros * quantite
  const caCmds = cmdsFiltrees.reduce((s, c) => s + (c.prix_final_client || 0) * (c.quantite || 0), 0);
  const margeCmds = cmdsFiltrees.reduce((s, c) => {
    const prixGros = (c.prix_gros || 0) * (c.quantite || 0);
    const commission = c.commission_vendeur || 0;
    const ca = (c.prix_final_client || 0) * (c.quantite || 0);
    return s + ca - prixGros - commission;
  }, 0);

  const caTotal = caVentes + caCmds;
  const margeTotal = margeVentes + margeCmds;
  const tauxMarge = caTotal > 0 ? ((margeTotal / caTotal) * 100).toFixed(1) : 0;
  const nbTransactions = ventesFiltrees.length + cmdsFiltrees.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Carte
        titre="Chiffre d'Affaires Total"
        valeur={fmt(caTotal)}
        sous={`Ventes: ${fmt(caVentes)} | Vendeurs: ${fmt(caCmds)}`}
        icone={DollarSign}
        couleurBg="bg-blue-50"
        couleurTexte="text-blue-600"
      />
      <Carte
        titre="Marge Brute Globale"
        valeur={fmt(margeTotal)}
        sous={`Taux: ${tauxMarge}%`}
        icone={TrendingUp}
        couleurBg="bg-emerald-50"
        couleurTexte="text-emerald-600"
      />
      <Carte
        titre="Nombre de Transactions"
        valeur={nbTransactions}
        sous={`${ventesFiltrees.length} directes • ${cmdsFiltrees.length} vendeurs`}
        icone={ShoppingCart}
        couleurBg="bg-purple-50"
        couleurTexte="text-purple-600"
      />
      <Carte
        titre="Panier Moyen"
        valeur={fmt(nbTransactions > 0 ? caTotal / nbTransactions : 0)}
        sous="Par transaction"
        icone={Package}
        couleurBg="bg-yellow-50"
        couleurTexte="text-yellow-600"
      />
    </div>
  );
}