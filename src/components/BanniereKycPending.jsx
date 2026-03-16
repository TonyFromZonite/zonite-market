import React from "react";
import { Clock } from "lucide-react";

/**
 * Bannière jaune affichée sur toutes les pages de l'espace vendeur
 * quand le KYC est en cours de vérification.
 */
export default function BanniereKycPending() {
  return (
    <div className="bg-yellow-50 border-b-2 border-yellow-300 px-4 py-3 flex items-start gap-3">
      <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-yellow-800 font-bold text-sm">⏳ Vérification en cours</p>
        <p className="text-yellow-700 text-xs mt-0.5">
          Vos documents KYC sont en cours de vérification par notre équipe.
          Vous serez notifié dès que votre compte est activé.
        </p>
        <p className="text-yellow-600 text-xs mt-1 font-medium">Délai habituel : 24 à 48h</p>
      </div>
    </div>
  );
}