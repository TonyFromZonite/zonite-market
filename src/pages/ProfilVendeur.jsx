import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LogOut, ChevronLeft, User, Phone, MapPin, Wallet, TrendingUp, ShoppingBag } from "lucide-react";

export default function ProfilVendeur() {
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const charger = async () => {
      const u = await base44.auth.me();
      const comptes = await base44.entities.CompteVendeur.filter({ user_email: u.email });
      if (comptes.length > 0) setCompteVendeur(comptes[0]);
      setChargement(false);
    };
    charger();
  }, []);

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  if (chargement) return (
    <div className="p-4 space-y-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-[#1a1f5e] text-white px-4 pt-6 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">Mon Profil</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#F5C518] rounded-2xl flex items-center justify-center text-[#1a1f5e] text-2xl font-bold">
            {compteVendeur?.nom_complet?.[0]?.toUpperCase() || "V"}
          </div>
          <div>
            <p className="font-bold text-lg">{compteVendeur?.nom_complet || "Vendeur"}</p>
            <Badge className={`text-xs border-0 mt-1 ${compteVendeur?.statut === "actif" ? "bg-emerald-500 text-white" : "bg-yellow-500 text-white"}`}>
              {compteVendeur?.statut === "actif" ? "✓ Compte actif" : "En attente"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Ventes", val: compteVendeur?.nombre_ventes || 0, icone: ShoppingBag },
            { label: "Commissions", val: formater(compteVendeur?.total_commissions_gagnees), icone: TrendingUp },
            { label: "Solde", val: formater(compteVendeur?.solde_commission), icone: Wallet },
          ].map(({ label, val, icone: Icone }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="font-bold text-slate-900 text-sm">{val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Infos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3 text-sm">Informations personnelles</h2>
          <div className="space-y-3">
            {[
              { icone: User, label: "Nom", val: compteVendeur?.nom_complet },
              { icone: Phone, label: "Téléphone", val: compteVendeur?.telephone },
              { icone: MapPin, label: "Localisation", val: `${compteVendeur?.ville || ""}${compteVendeur?.quartier ? `, ${compteVendeur.quartier}` : ""}` },
              { icone: Wallet, label: "Mobile Money", val: `${compteVendeur?.numero_mobile_money || "—"} (${compteVendeur?.operateur_mobile_money === "orange_money" ? "Orange Money" : "MTN MoMo"})` },
            ].map(({ icone: Icone, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Icone className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-medium text-slate-900">{val || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statut KYC */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-2 text-sm">Statut du compte</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: "KYC", val: compteVendeur?.statut_kyc === "valide" ? "✓ Validé" : "En attente", ok: compteVendeur?.statut_kyc === "valide" },
              { label: "Formation", val: compteVendeur?.video_vue ? "✓ Complétée" : "Non complétée", ok: compteVendeur?.video_vue },
              { label: "Catalogue", val: compteVendeur?.catalogue_debloque ? "✓ Débloqué" : "Verrouillé", ok: compteVendeur?.catalogue_debloque },
            ].map(({ label, val, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-500">{label}</span>
                <span className={`font-medium ${ok ? "text-emerald-600" : "text-yellow-600"}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {(compteVendeur?.solde_commission || 0) >= 5000 && (
          <Link to={createPageUrl("DemandePaiement")}>
            <Button className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
              Demander un paiement → {formater(compteVendeur?.solde_commission)}
            </Button>
          </Link>
        )}

        <Button
          variant="outline"
          onClick={() => base44.auth.logout()}
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠" },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋" },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦" },
          { label: "Profil", page: "ProfilVendeur", icone: "👤" },
        ].map(({ label, page, icone }) => (
          <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-3 gap-1">
            <span className="text-xl">{icone}</span>
            <span className={`text-[10px] ${page === "ProfilVendeur" ? "text-[#1a1f5e] font-bold" : "text-slate-600"}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}