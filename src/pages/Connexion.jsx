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

const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" />
  </svg>
);

// Modes de connexion
const MODE_VENDEUR = "vendeur";
const MODE_ADMIN = "admin";

export default function Connexion() {
  const [mode, setMode] = useState(MODE_VENDEUR);
  const [username, setUsername] = useState("");
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

  // Connexion sous-admin (username + mot de passe)
  const connexionSousAdmin = async (e) => {
    e.preventDefault();
    if (!username || !motDePasse) { setErreur("Veuillez remplir tous les champs."); return; }
    setChargement(true);
    setErreur("");
    try {
      const resultats = await base44.entities.SousAdmin.filter({ statut: "actif" });
      const sousAdmin = resultats.find(
        (sa) =>
          (sa.username === username || sa.email === username) &&
          sa.mot_de_passe_hash === btoa(motDePasse)
      );
      if (sousAdmin) {
        sessionStorage.setItem("sous_admin", JSON.stringify(sousAdmin));
        window.location.href = createPageUrl("TableauDeBord");
        return;
      }
      setErreur("Identifiants incorrects ou compte suspendu.");
    } catch (_) {
      setErreur("Erreur lors de la connexion. Réessayez.");
    }
    setChargement(false);
  };

  const lienFacebook = configs["lien_facebook"] || "https://facebook.com";
  const lienTiktok = configs["lien_tiktok"] || "https://tiktok.com";
  const messageAccueil = configs["message_accueil"] || MESSAGES_MOTIVATION[msgIndex];
  const nomApp = configs["nom_app"] || "ZONITE Vendeurs";

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#0d1240] via-[#1a1f5e] to-[#2d34a5] flex flex-col items-center justify-between px-5 overflow-hidden relative"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))", paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Décorations */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-24 left-0 w-56 h-56 bg-[#F5C518]/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-32 h-32 bg-[#F5C518]/5 rounded-full translate-x-1/2 pointer-events-none" />

      {/* Logo + Titre */}
      <div className="w-full flex flex-col items-center mt-4 mb-4 relative z-10">
        <div className="w-20 h-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-3 overflow-hidden border-4 border-[#F5C518]/40">
          <img src={LOGO} alt="Logo" className="w-full h-full object-contain p-0.5" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight text-center leading-tight">
          {nomApp.split(" ").map((w, i) =>
            i > 0 ? <span key={i} className="text-[#F5C518]"> {w}</span> : w
          )}
        </h1>
        <p className="text-slate-300 text-sm mt-1.5 text-center max-w-xs leading-relaxed px-4">
          {messageAccueil}
        </p>
      </div>

      {/* Sélecteur de mode */}
      <div className="w-full max-w-sm relative z-10 mb-3">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-1 flex border border-white/15">
          <button
            onClick={() => { setMode(MODE_VENDEUR); setErreur(""); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === MODE_VENDEUR ? "bg-[#F5C518] text-[#1a1f5e] shadow" : "text-slate-300 hover:text-white"}`}
          >
            👤 Espace Vendeur
          </button>
          <button
            onClick={() => { setMode(MODE_ADMIN); setErreur(""); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === MODE_ADMIN ? "bg-white text-[#1a1f5e] shadow" : "text-slate-300 hover:text-white"}`}
          >
            🔐 Espace Admin
          </button>
        </div>
      </div>

      {/* Formulaire */}
      <div className="w-full max-w-sm relative z-10 flex-1 flex flex-col justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">

          {/* MODE VENDEUR */}
          {mode === MODE_VENDEUR && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white font-bold text-lg">Connexion Vendeur</h2>
                <p className="text-slate-300 text-xs mt-0.5">Accédez à votre espace de vente ZONITE</p>
              </div>
              <Button
                onClick={() => base44.auth.redirectToLogin(createPageUrl("EspaceVendeur"))}
                className="w-full h-12 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black text-base rounded-xl shadow-lg shadow-[#F5C518]/20 transition-all active:scale-95"
              >
                Se connecter → Espace Vendeur
              </Button>
              <p className="text-center text-slate-400 text-xs">
                Une invitation sera envoyée à votre email par l'équipe ZONITE.
              </p>
              <div className="border-t border-white/10 pt-3 text-center">
                <p className="text-slate-400 text-xs">Pas encore vendeur ?{" "}
                  <a href={createPageUrl("Candidature")} className="text-[#F5C518] font-semibold hover:underline">
                    Postuler maintenant
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* MODE ADMIN / SOUS-ADMIN */}
          {mode === MODE_ADMIN && (
            <div>
              <div className="mb-4">
                <h2 className="text-white font-bold text-lg">Connexion Administrateur</h2>
                <p className="text-slate-300 text-xs mt-0.5">Sous-admins : utilisez vos identifiants attribués</p>
              </div>
              <form onSubmit={connexionSousAdmin} className="space-y-4">
                <div>
                  <label className="text-slate-200 text-xs font-medium block mb-1.5">Nom d'utilisateur ou email</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username ou email@example.com"
                    autoComplete="username"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-[#F5C518] rounded-xl h-11"
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
                      autoComplete="current-password"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-[#F5C518] rounded-xl h-11 pr-12"
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
                  className="w-full h-11 bg-white hover:bg-slate-100 text-[#1a1f5e] font-black text-sm rounded-xl transition-all active:scale-95"
                >
                  {chargement ? "Vérification..." : "Accéder au panneau admin →"}
                </Button>
              </form>

              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <button
                  onClick={() => base44.auth.redirectToLogin(createPageUrl("TableauDeBord"))}
                  className="text-slate-400 text-xs hover:text-[#F5C518] transition-colors underline underline-offset-2"
                >
                  Admin principal → Connexion via lien magique
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Réseaux sociaux */}
      <div className="relative z-10 flex flex-col items-center gap-3 mt-5">
        <p className="text-slate-400 text-xs">Suivez-nous sur</p>
        <div className="flex items-center gap-3">
          <a
            href={lienFacebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-[#1877F2]/30 border border-white/20 rounded-2xl px-4 py-2 text-white text-sm font-medium transition-all active:scale-95"
          >
            <Facebook className="w-4 h-4 text-[#1877F2]" />
            Facebook
          </a>
          <a
            href={lienTiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-4 py-2 text-white text-sm font-medium transition-all active:scale-95"
          >
            <TikTokIcon size={16} />
            TikTok
          </a>
        </div>
        <p className="text-slate-500 text-[10px]">© {new Date().getFullYear()} ZONITE — Tous droits réservés</p>
      </div>
    </div>
  );
}