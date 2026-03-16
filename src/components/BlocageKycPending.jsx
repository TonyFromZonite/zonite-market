import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, ChevronLeft } from "lucide-react";
import BanniereKycPending from "@/components/BanniereKycPending";

/**
 * Composant de blocage doux pour les pages inaccessibles pendant kyc_pending.
 * Affiche la bannière + un message sans erreur technique.
 */
export default function BlocageKycPending({ titre }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 pb-4" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">{titre}</h1>
        </div>
      </div>

      <BanniereKycPending />

      <div className="flex flex-col items-center justify-center px-4 pt-16 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Fonctionnalité bientôt disponible</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          Cette fonctionnalité sera disponible dès que votre KYC est validé par notre équipe.
        </p>
        <p className="text-xs text-slate-400 mt-3">Délai habituel : 24 à 48h</p>
      </div>
    </div>
  );
}