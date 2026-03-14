import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Facebook } from "lucide-react";
import { createPageUrl } from "@/utils";
import { LOGO_URL as LOGO } from "@/components/constants";

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

const MODE_VENDEUR = "vendeur";
const MODE_ADMIN = "admin";



export default function Connexion() {
  const [mode, setMode] = useState(MODE_VENDEUR);

  // Champs communs
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [mdpVisible, setMdpVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [configs, setConfigs] = useState({});
  const [msgIndex] = useState(() => Math.floor(Math.random() * MESSAGES_MOTIVATION.length));

  // Mode "mot de passe oublié" vendeur
  const [modeMdpOublie, setModeMdpOublie] = useState(false);
  const [emailOublie, setEmailOublie] = useState("");
  const [mdpOublieSucces, setMdpOublieSucces] = useState(false);
  const [chargementOublie, setChargementOublie] = useState(false);

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

  // Connexion vendeur (email + mot de passe via fonction backend sécurisée)
  const connexionVendeur = async (e) => {
    e.preventDefault();
    if (!email || !motDePasse) { setErreur("Veuillez remplir tous les champs."); return; }
    setChargement(true);
    setErreur("");
    try {
      const response = await base44.functions.invoke('loginUser', {
        email,
        password: motDePasse,
        userType: 'vendeur'
      });
      if (response.data.success) {
        console.log("✅ Login success:", response.data.session);
        sessionStorage.setItem("vendeur_session", JSON.stringify(response.data.session));
        window.location.href = createPageUrl("EspaceVendeur");
      } else if (response.data.pendingApproval) {
        window.location.href = createPageUrl("EnAttenteValidation");
      } else {
        setErreur(response.data.error || "Identifiants incorrects.");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur lors de la connexion. Réessayez.";
      setErreur(errorMsg);
    }
    setChargement(false);
  };

  // Mot de passe oublié vendeur : appelle fonction backend sécurisée
  const mdpOublie = async (e) => {
    e.preventDefault();
    if (!emailOublie) { setErreur("Entrez votre email."); return; }
    setChargementOublie(true);
    setErreur("");
    try {
      const response = await base44.functions.invoke('resetPassword', {
        email: emailOublie
      });
      if (response.data.success) {
        setMdpOublieSucces(true);
      } else {
        setErreur("Erreur lors de l'envoi. Réessayez.");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur lors de l'envoi. Réessayez.";
      setErreur(errorMsg);
    }
    setChargementOublie(false);
  };

  // Connexion sous-admin et admin via fonction backend sécurisée
  const connexionSousAdmin = async (e) => {
    e.preventDefault();
    if (!email || !motDePasse) { setErreur("Veuillez remplir tous les champs."); return; }
    setChargement(true);
    setErreur("");
    try {
      const response = await base44.functions.invoke('loginUser', {
        email,
        password: motDePasse,
        userType: 'admin'
      });
      if (response.data.success) {
        if (response.data.session.role === 'admin') {
          sessionStorage.setItem("admin_session", JSON.stringify(response.data.session));
          window.location.href = createPageUrl("TableauDeBord");
        } else if (response.data.session.role === 'sous_admin') {
          sessionStorage.setItem("sous_admin", JSON.stringify(response.data.session));
          window.location.href = createPageUrl("EspaceSousAdmin");
        }
      } else {
        setErreur("Identifiants incorrects ou compte suspendu.");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur lors de la connexion. Réessayez.";
      setErreur(errorMsg);
    }
    setChargement(false);
  };

  const lienFacebook = configs["lien_facebook"] || "https://facebook.com";
  const lienTiktok = configs["lien_tiktok"] || "https://tiktok.com";
  const messageAccueil = configs["message_accueil"] || MESSAGES_MOTIVATION[msgIndex];
  const nomApp = configs["nom_app"] || "ZONITE Vendeurs";

  const changerMode = (m) => { setMode(m); setErreur(""); setModeMdpOublie(false); setMdpOublieSucces(false); setEmail(""); setMotDePasse(""); };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#0d1240] via-[#1a1f5e] to-[#2d34a5] flex flex-col items-center justify-between px-5 relative overflow-hidden"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))", paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Décorations */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-24 left-0 w-56 h-56 bg-[#F5C518]/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Logo + Titre */}
      <div className="w-full flex flex-col items-center mt-3 mb-6 md:mt-4 md:mb-8 relative z-10 px-3">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-2 md:mb-3 overflow-hidden border-4 border-[#F5C518]/40">
          <img src={LOGO} alt="Logo" className="w-full h-full object-contain p-0.5" />
        </div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight text-center leading-tight">
          {nomApp.split(" ").map((w, i) =>
            i > 0 ? <span key={i} className="text-[#F5C518]"> {w}</span> : w
          )}
        </h1>
        <p className="text-slate-300 text-xs md:text-sm mt-2 md:mt-1.5 text-center max-w-xs leading-relaxed px-3">
          {messageAccueil}
        </p>
      </div>

      {/* Sélecteur de mode */}
      <div className="w-full max-w-sm relative z-10 mb-4 md:mb-6 px-3">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-1 flex border border-white/15">
          <button
            onClick={() => changerMode(MODE_VENDEUR)}
            className={`flex-1 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${mode === MODE_VENDEUR ? "bg-[#F5C518] text-[#1a1f5e] shadow" : "text-slate-300 hover:text-white"}`}
          >
            👤 Espace Vendeur
          </button>
          <button
            onClick={() => changerMode(MODE_ADMIN)}
            className={`flex-1 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${mode === MODE_ADMIN ? "bg-white text-[#1a1f5e] shadow" : "text-slate-300 hover:text-white"}`}
          >
            🔐 Espace Admin
          </button>
        </div>
      </div>

      {/* Formulaire */}
      <div className="w-full max-w-sm relative z-10 flex-1 flex flex-col justify-center px-3">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 md:p-6 border border-white/20 shadow-2xl">

          {/* MODE VENDEUR */}
          {mode === MODE_VENDEUR && !modeMdpOublie && (
            <div>
              <h2 className="text-white font-bold text-lg md:text-xl mb-0.5">Connexion Vendeur</h2>
              <p className="text-slate-300 text-xs mb-4">Entrez vos identifiants reçus par email.</p>
              <form onSubmit={connexionVendeur} className="space-y-4">
                <div>
                  <label className="text-slate-200 text-xs font-medium block mb-1.5">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="email"
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
                    <button type="button" onClick={() => setMdpVisible(!mdpVisible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                      {mdpVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {erreur && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
                    <p className="text-red-300 text-xs">{erreur}</p>
                  </div>
                )}

                <Button type="submit" disabled={chargement} className="w-full h-11 md:h-12 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black text-sm md:text-base rounded-xl shadow-lg shadow-[#F5C518]/20 transition-all active:scale-95">
                  {chargement ? "Vérification..." : "Se connecter →"}
                </Button>
              </form>
              <div className="mt-3 md:mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <button onClick={() => { setModeMdpOublie(true); setErreur(""); }} className="text-slate-400 text-xs hover:text-[#F5C518] transition-colors underline underline-offset-2 text-center md:text-left">
                  Mot de passe oublié ?
                </button>
                <a href={createPageUrl("InscriptionVendeur")} className="text-[#F5C518] text-xs font-semibold hover:underline text-center md:text-right">
                  Créer mon compte →
                </a>
              </div>
            </div>
          )}

          {/* MODE MOT DE PASSE OUBLIÉ */}
          {mode === MODE_VENDEUR && modeMdpOublie && (
            <div>
              <button onClick={() => { setModeMdpOublie(false); setErreur(""); setMdpOublieSucces(false); }} className="text-slate-400 text-xs hover:text-white mb-3 flex items-center gap-1">
                ← Retour
              </button>
              <h2 className="text-white font-bold text-lg md:text-xl mb-0.5">Mot de passe oublié</h2>
              <p className="text-slate-300 text-xs mb-4">Un lien de réinitialisation vous sera envoyé par email.</p>
              {mdpOublieSucces ? (
                <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-4 text-center">
                  <p className="text-emerald-300 text-sm font-semibold">✓ Email envoyé !</p>
                  <p className="text-emerald-200 text-xs mt-1">Vérifiez votre boîte mail et cliquez sur le lien pour choisir un nouveau mot de passe.</p>
                  <button onClick={() => { setModeMdpOublie(false); setMdpOublieSucces(false); }} className="mt-3 text-[#F5C518] text-xs underline">
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={mdpOublie} className="space-y-4">
                  <div>
                    <label className="text-slate-200 text-xs font-medium block mb-1.5">Votre email</label>
                    <Input
                      type="email"
                      value={emailOublie}
                      onChange={(e) => setEmailOublie(e.target.value)}
                      placeholder="votre@email.com"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-[#F5C518] rounded-xl h-11"
                    />
                  </div>
                  {erreur && (
                    <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
                      <p className="text-red-300 text-xs">{erreur}</p>
                    </div>
                  )}
                  <Button type="submit" disabled={chargementOublie} className="w-full h-11 md:h-12 bg-white hover:bg-slate-100 text-[#1a1f5e] font-black text-sm md:text-base rounded-xl transition-all active:scale-95">
                    {chargementOublie ? "Envoi en cours..." : "Recevoir un nouveau mot de passe"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* MODE ADMIN */}
          {mode === MODE_ADMIN && (
            <div>
              <h2 className="text-white font-bold text-lg md:text-xl mb-0.5">Connexion Administrateur</h2>
              <p className="text-slate-300 text-xs mb-4">Sous-admins : utilisez vos identifiants attribués.</p>
              <form onSubmit={connexionSousAdmin} className="space-y-4">
                <div>
                  <label className="text-slate-200 text-xs font-medium block mb-1.5">Nom d'utilisateur ou email</label>
                  <Input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    <button type="button" onClick={() => setMdpVisible(!mdpVisible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                      {mdpVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {erreur && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
                    <p className="text-red-300 text-xs">{erreur}</p>
                  </div>
                )}
                <Button type="submit" disabled={chargement} className="w-full h-11 md:h-12 bg-white hover:bg-slate-100 text-[#1a1f5e] font-black text-sm md:text-base rounded-xl transition-all active:scale-95">
                  {chargement ? "Vérification..." : "Accéder au panneau admin →"}
                </Button>
              </form>

            </div>
          )}
        </div>
      </div>

      {/* Réseaux sociaux */}
      <div className="relative z-10 flex flex-col items-center gap-3 md:gap-4 mt-5 md:mt-8 px-3">
        <p className="text-slate-400 text-xs md:text-sm">Suivez-nous sur</p>
        <div className="flex items-center gap-2 md:gap-3">
          <a href={lienFacebook} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-[#1877F2]/30 border border-white/20 rounded-2xl px-3 md:px-4 py-1.5 md:py-2 text-white text-xs md:text-sm font-medium transition-all active:scale-95">
            <Facebook className="w-3 h-3 md:w-4 md:h-4 text-[#1877F2]" /> <span className="hidden sm:inline">Facebook</span>
          </a>
          <a href={lienTiktok} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-3 md:px-4 py-1.5 md:py-2 text-white text-xs md:text-sm font-medium transition-all active:scale-95">
            <TikTokIcon size={14} /> <span className="hidden sm:inline">TikTok</span>
          </a>
        </div>
        <p className="text-slate-500 text-[10px] md:text-xs">© {new Date().getFullYear()} ZONITE — Tous droits réservés</p>
      </div>
    </div>
  );
}