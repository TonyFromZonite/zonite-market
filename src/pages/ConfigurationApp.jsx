import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Facebook, Globe, MessageCircle } from "lucide-react";

const CONFIGS = [
  { cle: "lien_youtube_formation", label: "Lien YouTube vidéo de formation", placeholder: "https://www.youtube.com/embed/dQw4w9WgXcQ", icone: Globe, couleur: "text-red-600" },
  { cle: "lien_facebook", label: "Lien Facebook", placeholder: "https://facebook.com/votrepagezone", icone: Facebook, couleur: "text-blue-600" },
  { cle: "lien_tiktok", label: "Lien TikTok", placeholder: "https://tiktok.com/@votrecompte", icone: Globe, couleur: "text-slate-700" },
  { cle: "message_accueil", label: "Message de bienvenue (page connexion)", placeholder: "Chaque vente est une victoire. Allons-y ! 🚀", icone: MessageCircle, couleur: "text-emerald-600" },
  { cle: "nom_app", label: "Nom de l'application (ex: ZONITE Vendeurs)", placeholder: "ZONITE Vendeurs", icone: Globe, couleur: "text-[#1a1f5e]" },
];

import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, Youtube } from "lucide-react";

export default function ConfigurationApp() {
  const [valeurs, setValeurs] = useState({});
  const [ids, setIds] = useState({});
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    const charger = async () => {
      const items = await base44.entities.ConfigApp.filter({});
      const map = {};
      const idMap = {};
      items.forEach((i) => { map[i.cle] = i.valeur; idMap[i.cle] = i.id; });
      setValeurs(map);
      setIds(idMap);
    };
    charger();
  }, []);

  const sauvegarder = async () => {
    setChargement(true);
    setSucces(false);
    for (const { cle } of CONFIGS) {
      const valeur = valeurs[cle] || "";
      if (ids[cle]) {
        await adminApi.updateConfigApp(ids[cle], { cle, valeur });
      } else if (valeur) {
        const res = await adminApi.createConfigApp({ cle, valeur });
        setIds((prev) => ({ ...prev, [cle]: res.result?.id }));
      }
    }
    setChargement(false);
    setSucces(true);
    setTimeout(() => setSucces(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Configuration de l'Application</h2>
        <p className="text-sm text-slate-500">Personnalisez les liens réseaux sociaux et les textes affichés sur la page de connexion.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
         {CONFIGS.map(({ cle, label, placeholder, icone: Icone, couleur }) => (
           <div key={cle}>
             <Label className="flex items-center gap-2 mb-1.5">
               <Icone className={`w-4 h-4 ${couleur}`} />
               {label}
             </Label>
             <Input
               value={valeurs[cle] || ""}
               onChange={(e) => setValeurs({ ...valeurs, [cle]: e.target.value })}
               placeholder={placeholder}
             />
             {cle === "lien_youtube_formation" && (
               <p className="text-xs text-slate-500 mt-1">💡 Collez l'URL complète YouTube ou l'URL embed (ex: https://www.youtube.com/embed/VIDEO_ID)</p>
             )}
           </div>
         ))}

        <div className="pt-2 flex items-center gap-3">
          <Button
            onClick={sauvegarder}
            disabled={chargement}
            className="bg-[#1a1f5e] hover:bg-[#141952]"
          >
            <Save className="w-4 h-4 mr-2" />
            {chargement ? "Enregistrement..." : "Sauvegarder"}
          </Button>
          {succes && (
            <span className="text-emerald-600 text-sm font-medium">✓ Modifications enregistrées</span>
          )}
        </div>
      </div>

      {/* Aperçu */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Aperçu page de connexion</p>
        <div className="flex gap-3">
          <a
            href={valeurs["lien_facebook"] || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-blue-700 text-sm font-medium"
          >
            <Facebook className="w-4 h-4" /> Facebook
          </a>
          <a
            href={valeurs["lien_tiktok"] || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 text-sm font-medium"
          >
            TikTok
          </a>
        </div>
        {valeurs["message_accueil"] && (
          <p className="mt-3 text-sm text-slate-600 italic">"{valeurs["message_accueil"]}"</p>
        )}
      </div>

      {/* Sécurité Admin */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#1a1f5e]" />
            <div>
              <p className="font-bold text-slate-900">Sécurité Administrateur</p>
              <p className="text-sm text-slate-500">Configurez votre mot de passe pour l'accès mobile</p>
            </div>
          </div>
          <Link to={createPageUrl("ConfigurationAdminPassword")}>
            <Button className="bg-[#1a1f5e] hover:bg-[#141952]">
              Gérer mot de passe →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}