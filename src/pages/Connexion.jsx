import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Facebook } from "lucide-react";
import { createPageUrl } from "@/utils";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg";

const MESSAGES_MOTIVATION = [
  "Chaque vente est une victoire. Allons-y ! 🚀",
  "Votre succès commence ici. Bienvenue ! 💪",
  "Ensemble, construisons quelque chose de grand. ✨",
  "Les champions se connectent tôt. C'est votre heure ! 🏆",
  "Prêt à performer aujourd'hui ? On vous attend ! 🔥",
];

// Icône TikTok personnalisée
const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z"/>
  </svg>
);

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [mdpVisible, setMdpVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [configs, setConfigs] = useState({});
  const [msgIndex] = useState(() => Math.floor(Math.random() * MESSAGES_MOTIVATION.length));

  useEffect(() => {
    const chargerConfigs = async () => {
      try {
        const items = await base44.entities.ConfigApp.filter({});
        const map = {};
        items.forEach((i) => { map[i.cle] = i.valeur; });
        setConfigs(map);
      } catch (_) {}
    };
    chargerConfigs();
  }, []);

  const seConnecter = async (e) => {
    e.preventDefault();
    if (!email || !motDePasse) { setErreur("Veuillez remplir tous les champs."); return; }
    setChargement(true);
    setErreur("");
    try {
      // Vérification sous-admin
      const sousAdmins = await base44.entities.SousAdmin.filter({ username: email, statut: "actif" });
      const sousAdmin = sousAdmins.find(
        (sa) => sa.mot_de_passe_hash === btoa(motDePasse) || sa.email === email
      );
      if (sousAdmin) {
        // Stocker session sous-admin
        sessionStorage.setItem("sous_admin", JSON.stringify(sousAdmin));
        window.location.href = createPageUrl("TableauDeBord");
        return;
      }
      // Connexion normale base44
      base44.auth.redirectToLogin(createPageUrl("EspaceVendeur"));
    } catch (err) {
      setErreur("Identifiants incorrects. Veuillez réessayer.");
    }
    setChargement(false);
  };

  const lienFacebook = configs["lien_facebook"] || "https://facebook.com";
  const lienTiktok = configs["lien_tiktok"] || "https://tiktok.com";
  const messageAccueil = configs["message_accueil"] || MESSAGES_MOTIVATION[msgIndex];
  const nomApp = configs["nom_app"] || "ZONITE Vendeurs";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1240] via-[#1a1f5e] to-[#2d34a5] flex flex-col items-center justify-between px-6 py-10"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))", paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}>

      {/* Décorations cercles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-48 h-48 bg-[#F5C518]/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Logo + Titre */}
      <div className="w-full flex flex-col items-center mt-6 mb-2 relative z-10">
        <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-4 overflow-hidden border-4 border-[#F5C518]/30">
          <img src={LOGO} alt="Logo" className="w-full h-full object-contain p-1" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight text-center leading-tight">
          {nomApp.split(" ").map((w, i) =>
            i > 0 ? <span key={i} className="text-[#F5C518]"> {w}</span> : w
          )}
        </h1>
        <p className="text-slate-300 text-sm mt-2 text-center max-w-xs leading-relaxed">
          {messageAccueil}
        </p>
      </div>

      {/* Formulaire */}
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
          <h2 className="text-white font-bold text-xl mb-1">Connexion</h2>
          <p className="text-slate-300 text-xs mb-5">Entrez vos identifiants pour accéder à votre espace.</p>

          <form onSubmit={seConnecter} className="space-y-4">
            <div>
              <label className="text-slate-200 text-xs font-medium block mb-1.5">Email ou nom d'utilisateur</label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-[#F5C518] focus:ring-[#F5C518]/30 rounded-xl h-12"
              />
            </div>
            <div>
              <label className="text-slate-200 text-xs font-medium block mb-1.5">Mot de passe</label>
              <div className="relative">
                <Input
                  type={mdpVisible ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-[#F5C518] focus:ring-[#F5C518]/30 rounded-xl h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setMdpVisible(!mdpVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {mdpVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {erreur && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
                <p className="text-red-300 text-xs">{erreur}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={chargement}
              className="w-full h-12 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black text-base rounded-xl shadow-lg shadow-[#F5C518]/20 transition-all active:scale-95"
            >
              {chargement ? "Connexion en cours..." : "Se connecter →"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="text-slate-300 text-xs hover:text-[#F5C518] transition-colors underline underline-offset-2"
            >
              Connexion via lien magique / Google
            </button>
          </div>
        </div>

        {/* Candidature */}
        <p className="text-center text-slate-400 text-xs mt-5">
          Pas encore vendeur ?{" "}
          <a href={createPageUrl("Candidature")} className="text-[#F5C518] font-semibold hover:underline">
            Postuler maintenant
          </a>
        </p>
      </div>

      {/* Réseaux sociaux */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <p className="text-slate-400 text-xs">Suivez-nous sur</p>
        <div className="flex items-center gap-4">
          <a
            href={lienFacebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-[#1877F2]/30 border border-white/20 rounded-2xl px-4 py-2 text-white text-sm font-medium transition-all active:scale-95"
          >
            <Facebook className="w-5 h-5 text-[#1877F2]" />
            Facebook
          </a>
          <a
            href={lienTiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-4 py-2 text-white text-sm font-medium transition-all active:scale-95"
          >
            <TikTokIcon size={18} />
            TikTok
          </a>
        </div>
        <p className="text-slate-500 text-[10px] mt-1">© {new Date().getFullYear()} ZONITE — Tous droits réservés</p>
      </div>
    </div>
  );
}