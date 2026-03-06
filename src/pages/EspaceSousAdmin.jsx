import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCachedQuery } from "@/components/CacheManager";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart, Package, Truck, MessageSquare, Users,
  Shield, LogOut, Lock, ShieldCheck
} from "lucide-react";

import { LOGO_URL as LOGO } from "@/components/constants";

const TOUS_MODULES = [
  { page: "CommandesVendeurs", label: "Commandes Vendeurs", emoji: "📋", icone: ShoppingCart, desc: "Valider et gérer les commandes" },
  { page: "Produits",          label: "Produits",           emoji: "📦", icone: Package,     desc: "Catalogue et stock" },
  { page: "Livraisons",        label: "Livraisons",         emoji: "🚚", icone: Truck,       desc: "Gérer les livreurs" },
  { page: "SupportAdmin",      label: "Support Vendeurs",   emoji: "💬", icone: MessageSquare, desc: "Tickets des vendeurs" },
  { page: "Vendeurs",          label: "Vendeurs",           emoji: "👥", icone: Users,       desc: "Comptes et KYC" },
  { page: "JournalAudit",      label: "Journal d'Audit",    emoji: "🛡️", icone: Shield,      desc: "Historique des actions" },
];

import { getSousAdminSession, clearAllSessions } from "@/components/useSessionGuard";

export default function EspaceSousAdmin() {
  const [sousAdmin] = useState(() => getSousAdminSession());

  const { data: commandesAttente = [], loading: isLoading } = useCachedQuery(
    'COMMANDES',
    () => base44.entities.CommandeVendeur.filter({ statut: "en_attente_validation_admin" }),
    { ttl: 5 * 60 * 1000, enabled: (sousAdmin?.permissions || []).includes("CommandesVendeurs") }
  );

  const modules = TOUS_MODULES.filter(m => (sousAdmin?.permissions || []).includes(m.page));

  const deconnexion = () => {
    clearAllSessions();
    window.location.href = createPageUrl("Connexion");
  };

  if (!sousAdmin) {
    window.location.href = createPageUrl("Connexion");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 pt-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Zonite" className="h-9 w-9 rounded-xl object-contain bg-white p-0.5" />
            <div>
              <p className="text-xs font-black tracking-tight leading-none">ZONITE <span className="text-[#F5C518]">Admin</span></p>
              <p className="text-slate-300 text-[10px] mt-0.5">Espace sous-administrateur</p>
            </div>
          </div>
          <button onClick={deconnexion} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
            <LogOut className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Carte identité */}
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-[#F5C518] rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#1a1f5e]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">{sousAdmin.nom_complet}</p>
            <p className="text-[#F5C518] text-xs font-semibold">{sousAdmin.nom_role}</p>
            <p className="text-slate-300 text-[10px] mt-0.5">
              {modules.length} module{modules.length > 1 ? "s" : ""} accessible{modules.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Modules accessibles */}
      <div className="px-4 -mt-5">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : modules.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <Lock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 mb-1">Aucun module accessible</p>
            <p className="text-slate-400 text-sm">Contactez l'administrateur principal pour obtenir des permissions.</p>
          </div>
        ) : (
          <>
            {commandesAttente.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 mb-4 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="text-yellow-800 text-sm font-semibold">
                  {commandesAttente.length} commande{commandesAttente.length > 1 ? "s" : ""} en attente de validation
                </p>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Mes modules</p>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((m) => {
                const badge = m.page === "CommandesVendeurs" && commandesAttente.length > 0 ? commandesAttente.length : 0;
                return (
                  <Link key={m.page} to={createPageUrl(m.page)}>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:shadow-md hover:border-[#1a1f5e]/20 transition-all relative overflow-hidden">
                      {badge > 0 && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                      <span className="text-2xl block mb-2">{m.emoji}</span>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{m.label}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{m.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}