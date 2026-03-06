import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { LOGO_URL as LOGO } from "@/components/constants";

export default function ResetPassword() {
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmerMdp, setConfirmerMdp] = useState("");
  const [mdpVisible, setMdpVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    setEmail(params.get("email") || "");
  }, []);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");

    if (nouveauMdp.length < 6) {
      setErreur("Le mot de passe doit contenir au moins 6 caractères."); return;
    }
    if (nouveauMdp !== confirmerMdp) {
      setErreur("Les mots de passe ne correspondent pas."); return;
    }
    if (!token || !email) {
      setErreur("Lien invalide. Refaites une demande de réinitialisation."); return;
    }

    setChargement(true);
    try {
      const response = await base44.functions.invoke('confirmResetPassword', {
        token,
        email,
        nouveau_mot_de_passe: nouveauMdp,
      });
      if (response.data.success) {
        setSucces(true);
      } else {
        setErreur("Erreur lors de la réinitialisation. Réessayez.");
      }
    } catch (err) {
      setErreur(err.response?.data?.error || "Token invalide ou expiré. Refaites une demande.");
    }
    setChargement(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src={LOGO} alt="Zonite" className="h-10 w-10 rounded-xl object-contain bg-white p-0.5" />
          <div>
            <p className="text-white font-black text-base leading-none">ZONITE</p>
            <p className="text-[#F5C518] text-[10px] font-semibold tracking-widest">VENDEURS</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
          {succes ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Mot de passe modifié !</h2>
              <p className="text-slate-300 text-sm mb-6">Votre mot de passe a été mis à jour avec succès.</p>
              <Link to={createPageUrl("Connexion")}>
                <Button className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black rounded-xl h-11">
                  Se connecter →
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-white font-bold text-xl mb-1">Nouveau mot de passe</h2>
              <p className="text-slate-300 text-xs mb-5">Choisissez un mot de passe sécurisé (min. 6 caractères).</p>
              <form onSubmit={soumettre} className="space-y-4">
                <div>
                  <label className="text-slate-200 text-xs font-medium block mb-1.5">Nouveau mot de passe</label>
                  <div className="relative">
                    <Input
                      type={mdpVisible ? "text" : "password"}
                      value={nouveauMdp}
                      onChange={(e) => setNouveauMdp(e.target.value)}
                      placeholder="••••••••"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 pr-12"
                    />
                    <button type="button" onClick={() => setMdpVisible(!mdpVisible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-slate-200 text-xs font-medium block mb-1.5">Confirmer le mot de passe</label>
                  <Input
                    type="password"
                    value={confirmerMdp}
                    onChange={(e) => setConfirmerMdp(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11"
                  />
                </div>
                {erreur && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
                    <p className="text-red-300 text-xs">{erreur}</p>
                  </div>
                )}
                <Button type="submit" disabled={chargement} className="w-full h-11 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black rounded-xl">
                  {chargement ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer le nouveau mot de passe"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link to={createPageUrl("Connexion")} className="text-slate-400 text-xs hover:text-[#F5C518] transition-colors">
                  ← Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}