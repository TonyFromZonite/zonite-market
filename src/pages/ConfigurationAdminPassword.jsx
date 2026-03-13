import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, X, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";


export default function ConfigurationAdminPassword() {
  const [chargement, setChargement] = useState(true);
  const [mdpActuel, setMdpActuel] = useState("");
  const [mdpNouveau, setMdpNouveau] = useState("");
  const [mdpConfirm, setMdpConfirm] = useState("");
  const [mdpVisible, setMdpVisible] = useState({ actuel: false, nouveau: false, confirm: false });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [entraitement, setEntraitement] = useState(false);
  const [adminMdpHash, setAdminMdpHash] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const configs = await base44.entities.ConfigApp.filter({});
        const configMap = {};
        configs.forEach(c => { configMap[c.cle] = c.valeur; });
        setAdminMdpHash(configMap["admin_password_hash"] || "");
      } catch (_) {
        setErreur("Erreur lors du chargement des configurations.");
      }
      setChargement(false);
    };
    charger();
  }, []);

  const genererMotDePasse = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");

    // Si pas de mot de passe existant, on n'a besoin que du nouveau
    const necessiteAncien = !!adminMdpHash;

    if (necessiteAncien && !mdpActuel) {
      setErreur("Veuillez entrer le mot de passe actuel.");
      return;
    }

    if (!mdpNouveau || !mdpConfirm) {
      setErreur("Tous les champs sont obligatoires.");
      return;
    }

    if (mdpNouveau !== mdpConfirm) {
      setErreur("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    if (mdpNouveau.length < 6) {
      setErreur("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setEntraitement(true);

    try {
      if (necessiteAncien) {
        // Vérifier ancien mot de passe via la fonction backend
        const response = await base44.functions.invoke('changePassword', {
          oldPassword: mdpActuel,
          newPassword: mdpNouveau,
          userType: 'admin'
        });
        if (response.data.success) {
          setSucces("Mot de passe mis à jour avec succès !");
          setMdpActuel("");
          setMdpNouveau("");
          setMdpConfirm("");
          setAdminMdpHash("set");
        } else {
          setErreur(response.data.error || "Mot de passe actuel incorrect.");
        }
      } else {
        // Création initiale — hash via fonction backend
        const response = await base44.functions.invoke('setAdminPassword', {
          password: mdpNouveau
        });
        if (response.data.success) {
          setSucces("Mot de passe créé avec succès ! Vous pouvez maintenant vous connecter.");
          setMdpNouveau("");
          setMdpConfirm("");
          setAdminMdpHash("set");
        } else {
          setErreur(response.data.error || "Erreur lors de la création du mot de passe.");
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur lors de la mise à jour du mot de passe.";
      setErreur(errorMsg);
    }

    setEntraitement(false);
  };

  if (chargement) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sécurité Admin</h1>
        <p className="text-slate-500 text-sm mb-6">Gérez votre mot de passe pour l'accès mobile et web.</p>

        {!adminMdpHash && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 text-sm font-medium">⚠️ Mot de passe non sécurisé</p>
              <p className="text-amber-700 text-xs mt-1">Le mot de passe actuel n'est pas un hash bcrypt valide. Créez un nouveau mot de passe sécurisé ci-dessous.</p>
            </div>
          </div>
        )}

        <form onSubmit={changerMotDePasse} className="space-y-5">
          {/* Mot de passe actuel - visible uniquement si un mot de passe existe */}
          {adminMdpHash && (
            <div>
              <label className="text-slate-700 font-medium text-sm block mb-2">Mot de passe actuel</label>
              <div className="relative">
                <Input
                  type={mdpVisible.actuel ? "text" : "password"}
                  value={mdpActuel}
                  onChange={(e) => setMdpActuel(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-50 border border-slate-300 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMdpVisible({ ...mdpVisible, actuel: !mdpVisible.actuel })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {mdpVisible.actuel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Nouveau mot de passe */}
          <div>
            <label className="text-slate-700 font-medium text-sm block mb-2">
              {adminMdpHash ? "Nouveau mot de passe" : "Créer un mot de passe"}
            </label>
            <div className="relative">
              <Input
                type={mdpVisible.nouveau ? "text" : "password"}
                value={mdpNouveau}
                onChange={(e) => setMdpNouveau(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-50 border border-slate-300 pr-10"
              />
              <button
                type="button"
                onClick={() => setMdpVisible({ ...mdpVisible, nouveau: !mdpVisible.nouveau })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {mdpVisible.nouveau ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-slate-400 text-xs">Minimum 6 caractères</p>
              {!adminMdpHash && (
                <button
                  type="button"
                  onClick={() => {
                    const generated = genererMotDePasse();
                    setMdpNouveau(generated);
                    setMdpConfirm(generated);
                  }}
                  className="text-[#1a1f5e] text-xs font-semibold hover:underline"
                >
                  Générer →
                </button>
              )}
            </div>
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <label className="text-slate-700 font-medium text-sm block mb-2">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <Input
                type={mdpVisible.confirm ? "text" : "password"}
                value={mdpConfirm}
                onChange={(e) => setMdpConfirm(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-50 border border-slate-300 pr-10"
              />
              <button
                type="button"
                onClick={() => setMdpVisible({ ...mdpVisible, confirm: !mdpVisible.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {mdpVisible.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Messages */}
          {erreur && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{erreur}</p>
            </div>
          )}

          {succes && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-sm">{succes}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={entraitement}
              className="bg-[#1a1f5e] hover:bg-[#141952] text-white font-bold"
            >
              {entraitement ? "Mise à jour..." : (adminMdpHash ? "Changer le mot de passe" : "Créer le mot de passe")}
            </Button>
          </div>

          {adminMdpHash && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-blue-700 text-xs">✓ Mot de passe configuré — Vous pouvez vous connecter depuis l'app mobile avec username "admin".</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}