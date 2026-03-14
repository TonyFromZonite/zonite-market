import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Upload, AlertCircle, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ResoumissionKYC() {
  const [vendeur, setVendeur] = useState(null);
  const [form, setForm] = useState({
    photo_identite_url: "",
    photo_identite_verso_url: "",
    selfie_url: "",
  });
  const [uploadEnCours, setUploadEnCours] = useState({ id: false, idVerso: false, selfie: false });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [typeDocument, setTypeDocument] = useState("cni");

  useEffect(() => {
    const chargerVendeur = async () => {
      try {
        const user = await base44.auth.me();
        const sellers = await base44.asServiceRole.entities.Seller.filter({ email: user.email });
        if (sellers.length > 0) {
          setVendeur(sellers[0]);
          // Charger les documents existants
          setForm({
            photo_identite_url: sellers[0].photo_identite_url || "",
            photo_identite_verso_url: sellers[0].photo_identite_verso_url || "",
            selfie_url: sellers[0].selfie_url || "",
          });
        }
      } catch (e) {
        console.error("Erreur:", e);
      }
    };
    chargerVendeur();
  }, []);

  const uploadFichier = async (fichier, champ) => {
    const key = champ === "photo_identite_url" ? "id" : champ === "photo_identite_verso_url" ? "idVerso" : "selfie";
    setUploadEnCours(p => ({ ...p, [key]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fichier });
      setForm(p => ({ ...p, [champ]: file_url }));
    } finally {
      setUploadEnCours(p => ({ ...p, [key]: false }));
    }
  };

  const soumettre = async () => {
    if (!form.photo_identite_url) {
      setErreur("Veuillez uploader votre pièce d'identité."); return;
    }
    if (typeDocument === "cni" && !form.photo_identite_verso_url) {
      setErreur("Veuillez uploader le verso de votre CNI."); return;
    }
    if (!form.selfie_url) {
      setErreur("Veuillez uploader votre selfie."); return;
    }

    setEnCours(true);
    setErreur("");

    try {
      const response = await base44.functions.invoke('resubmitKYC', {
        photo_identite_url: form.photo_identite_url,
        photo_identite_verso_url: form.photo_identite_verso_url || "",
        selfie_url: form.selfie_url,
      });

      if (response.data?.success) {
        setSucces(true);
      } else {
        setErreur(response.data?.error || "Erreur lors de la resoumission.");
      }
    } catch (error) {
      setErreur(error.response?.data?.error || error.message || "Erreur lors de la resoumission.");
    } finally {
      setEnCours(false);
    }
  };

  if (!vendeur) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex items-center justify-center p-4">
        <div className="text-white text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (vendeur.statut_kyc !== 'rejete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Dossier KYC Approuvé ✓</h2>
          <p className="text-sm text-slate-500 mb-5">Votre dossier a déjà été validé ou est en cours de vérification.</p>
          <Link to={createPageUrl("EspaceVendeur")}>
            <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952]">Retour à mon espace</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Dossier Resoumis ! 📝</h2>
          <p className="text-sm text-slate-500 mb-3">Merci d'avoir corrigé votre dossier.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-5">
            <p className="font-semibold mb-1">⏳ Prochaine étape :</p>
            <p>Notre équipe examinera votre nouveau dossier sous <strong>24 à 48h</strong>.</p>
          </div>
          <Link to={createPageUrl("EspaceVendeur")}>
            <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952]">Retour à mon espace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex flex-col items-center justify-start px-4 py-8"
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top, 0px))" }}>

      <div className="w-full max-w-md flex items-center gap-3 mb-6">
        <Link to={createPageUrl("EspaceVendeur")}>
          <button className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </Link>
        <h1 className="text-xl font-black text-white">Resoumission KYC</h1>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">Correction de votre dossier</h2>
          <p className="text-slate-300 text-sm mt-1">Resoumettez les documents demandés</p>
        </div>

        {erreur && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 space-y-4">
          <div>
            <Label className="text-slate-200 text-xs mb-2 block">Type de document *</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setTypeDocument("cni"); setForm(p => ({...p, photo_identite_verso_url: ""})); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${typeDocument === "cni" ? "bg-[#F5C518] text-[#1a1f5e] border-[#F5C518]" : "bg-white/5 text-slate-300 border-white/20 hover:bg-white/10"}`}
              >
                🪪 CNI
              </button>
              <button
                type="button"
                onClick={() => { setTypeDocument("passeport"); setForm(p => ({...p, photo_identite_verso_url: ""})); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${typeDocument === "passeport" ? "bg-[#F5C518] text-[#1a1f5e] border-[#F5C518]" : "bg-white/5 text-slate-300 border-white/20 hover:bg-white/10"}`}
              >
                📘 Passeport
              </button>
            </div>
          </div>

          <div>
            <Label className="text-slate-200 text-xs mb-1.5 block">
              {typeDocument === "cni" ? "CNI — Recto *" : "Passeport — Page principale *"}
            </Label>
            <label htmlFor="id-photo" className={`flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${form.photo_identite_url ? "border-emerald-400 bg-emerald-500/10" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
              {uploadEnCours.id ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : form.photo_identite_url ? (
                <div className="text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <p className="text-emerald-300 text-xs font-medium">Photo uploadée ✓</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-slate-300 text-xs">Appuyez pour uploader</p>
                </div>
              )}
              <input type="file" accept="image/*" id="id-photo" className="hidden"
                onChange={e => e.target.files[0] && uploadFichier(e.target.files[0], "photo_identite_url")} />
            </label>
          </div>

          {typeDocument === "cni" && (
            <div>
              <Label className="text-slate-200 text-xs mb-1.5 block">CNI — Verso *</Label>
              <label htmlFor="id-verso" className={`flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${form.photo_identite_verso_url ? "border-emerald-400 bg-emerald-500/10" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
                {uploadEnCours.idVerso ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : form.photo_identite_verso_url ? (
                  <div className="text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-emerald-300 text-xs font-medium">Verso uploadé ✓</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-slate-300 text-xs">Appuyez pour uploader</p>
                  </div>
                )}
                <input type="file" accept="image/*" id="id-verso" className="hidden"
                  onChange={e => e.target.files[0] && uploadFichier(e.target.files[0], "photo_identite_verso_url")} />
              </label>
            </div>
          )}

          <div>
            <Label className="text-slate-200 text-xs mb-1.5 block">Selfie avec votre pièce d'identité *</Label>
            <label htmlFor="selfie" className={`flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${form.selfie_url ? "border-emerald-400 bg-emerald-500/10" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
              {uploadEnCours.selfie ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : form.selfie_url ? (
                <div className="text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <p className="text-emerald-300 text-xs font-medium">Selfie uploadé ✓</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-slate-300 text-xs">Tenez votre pièce d'identité visible</p>
                </div>
              )}
              <input type="file" accept="image/*" id="selfie" className="hidden"
                onChange={e => e.target.files[0] && uploadFichier(e.target.files[0], "selfie_url")} />
            </label>
          </div>

          <Button 
            onClick={soumettre} 
            disabled={enCours || uploadEnCours.id || uploadEnCours.selfie} 
            className="w-full h-11 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black rounded-xl">
            {enCours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Resoummettre mon dossier"}
          </Button>
        </div>
      </div>
    </div>
  );
}