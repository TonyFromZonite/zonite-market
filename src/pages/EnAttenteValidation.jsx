import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { LOGO_URL as LOGO } from "@/components/constants";

export default function EnAttenteValidation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src={LOGO} alt="Zonite" className="h-12 w-12 rounded-xl object-contain bg-white p-1" />
          <div className="text-left">
            <p className="text-[#1a1f5e] font-black text-lg leading-none">ZONITE</p>
            <p className="text-[#F5C518] text-[10px] font-semibold tracking-widest">VENDEURS</p>
          </div>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-900 mb-2">Validation en cours ⏳</h2>
        <p className="text-sm text-slate-500 mb-4">
          Votre compte est en cours de validation par notre équipe.
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mb-6">
          <p className="font-semibold mb-1">📧 Vérification KYC en cours</p>
          <p className="text-xs">
            Vous recevrez un email sous <strong>24-48h</strong> avec la décision de validation et vos identifiants de connexion définitifs si votre dossier est approuvé.
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
          <p className="text-xs font-semibold text-slate-700 mb-2">Prochaines étapes :</p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>✓ Votre dossier a été reçu</li>
            <li>⏳ Vérification de vos documents KYC</li>
            <li>📧 Email de confirmation à venir</li>
            <li>🎉 Accès au catalogue après validation</li>
          </ul>
        </div>

        {/* Action Button */}
        <Link to={createPageUrl("Connexion")}>
          <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952] h-11">
            Retour à la connexion
          </Button>
        </Link>
      </div>
    </div>
  );
}