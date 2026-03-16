import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, Upload, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { LOGO_URL as LOGO } from "@/components/constants";

const ETAPES = [
  { num: 1, label: "Mon compte" },
  { num: 2, label: "Vérifier email" },
  { num: 3, label: "Mon profil" },
];

// Générer un mot de passe aléatoire lisible (fallback si vendeur ne choisit pas)
function genererMdp() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function InscriptionVendeur() {
  const [etape, setEtape] = useState(1);
  const [typeDocument, setTypeDocument] = useState("cni"); // "cni" ou "passeport"
  const [form, setForm] = useState({
    // Étape 1 - Compte
    nom_complet: "",
    email: "",
    telephone: "",
    mot_de_passe: "",
    confirmer_mdp: "",
    // Étape 2 - Vérification email
    verification_code: "",
    // Étape 3 - Profil vendeur
    ville: "",
    quartier: "",
    numero_mobile_money: "",
    operateur_mobile_money: "orange_money",
    experience_vente: "",
    // Étape 4 - KYC
    photo_identite_url: "",      // passeport ou CNI recto
    photo_identite_verso_url: "", // CNI verso uniquement
    selfie_url: "",
  });
  const [mdpVisible, setMdpVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [uploadEnCours, setUploadEnCours] = useState({ id: false, idVerso: false, selfie: false });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [emailVerifie, setEmailVerifie] = useState(null); // null = pas verifié, true = ok, false = déjà utilisé
  const [vendeurEmail, setVendeurEmail] = useState(""); // Email du vendeur en cours d'inscription
  const [reenvoyerDisable, setReenvoyerDisable] = useState(false);

  const modifier = (champ, val) => setForm(p => ({ ...p, [champ]: val }));

  // Vérifier l'unicité de l'email en temps réel
  const verifierEmail = async (email) => {
    if (!email || !email.includes("@")) {
      setEmailVerifie(null);
      return;
    }
    try {
      const response = await base44.functions.invoke('checkEmailExists', { email });
      setEmailVerifie(!response.data.exists);
    } catch (e) {
      setEmailVerifie(null);
    }
  };

  const uploadFichier = async (fichier, champ) => {
    const key = champ === "photo_identite_url" ? "id" : champ === "photo_identite_verso_url" ? "idVerso" : "selfie";
    setUploadEnCours(p => ({ ...p, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file: fichier });
    modifier(champ, file_url);
    setUploadEnCours(p => ({ ...p, [key]: false }));
  };

  const validerEtape1 = async () => {
    if (!form.nom_complet || !form.email || !form.telephone) {
      setErreur("Nom complet, email et téléphone sont obligatoires."); return;
    }
    if (!form.email.includes("@")) {
      setErreur("L'email saisi n'est pas valide."); return;
    }
    if (emailVerifie === false) {
      setErreur("Cet email est déjà utilisé. Veuillez en choisir un autre."); return;
    }
    if (form.mot_de_passe.length < 6) {
      setErreur("Le mot de passe doit contenir au moins 6 caractères."); return;
    }
    if (form.mot_de_passe !== form.confirmer_mdp) {
      setErreur("Les mots de passe ne correspondent pas."); return;
    }

    setEnCours(true);
    setErreur("");

    try {
      const response = await base44.functions.invoke('registerVendeur', {
        email: form.email,
        nom_complet: form.nom_complet,
        telephone: form.telephone,
        mot_de_passe: form.mot_de_passe,
        ville: form.ville,
        quartier: form.quartier,
        numero_mobile_money: form.numero_mobile_money,
        operateur_mobile_money: form.operateur_mobile_money,
        photo_identite_url: "",
        photo_identite_verso_url: "",
        selfie_url: "",
      });

      if (response.data?.success) {
        setVendeurEmail(form.email);
        setErreur("");
        setEtape(2);
      } else {
        setErreur(response.data?.error || "Erreur lors de l'inscription");
      }
    } catch (error) {
      setErreur(error.message || "Erreur lors de l'inscription");
    } finally {
      setEnCours(false);
    }
  };

  const validerEtape2 = async () => {
    if (!form.verification_code || form.verification_code.length !== 6) {
      setErreur("Veuillez entrer un code à 6 chiffres"); return;
    }

    setEnCours(true);
    setErreur("");

    try {
      const response = await base44.functions.invoke('verifyEmailCode', {
        email: vendeurEmail,
        verification_code: form.verification_code,
      });

      if (response.data?.success) {
        // Email vérifié → passer à l'étape profil
        setEtape(3);
        setErreur("");
      } else {
        setErreur(response.data?.error || "Code invalide ou expiré");
      }
    } catch (error) {
      setErreur(error.message || "Erreur lors de la vérification");
    } finally {
      setEnCours(false);
    }
  };

  const renvoyerCode = async () => {
    setReenvoyerDisable(true);
    try {
      await base44.functions.invoke('resendVerificationCode', { email: vendeurEmail });
      setErreur("Code renvoyé par email");
      setTimeout(() => setReenvoyerDisable(false), 30000); // 30 secondes
    } catch (error) {
      setErreur("Erreur lors de l'envoi du code");
      setReenvoyerDisable(false);
    }
  };

  const validerEtape3 = async () => {
    if (!form.ville || !form.quartier || !form.numero_mobile_money) {
      setErreur("Ville, quartier et numéro Mobile Money sont obligatoires."); return;
    }
    setEnCours(true);
    setErreur("");
    const response = await base44.functions.invoke('vendeurActions', {
      action: 'updateProfil',
      vendeur_email: vendeurEmail,
      payload: {
        ville: form.ville,
        quartier: form.quartier,
        numero_mobile_money: form.numero_mobile_money,
        operateur_mobile_money: form.operateur_mobile_money,
      }
    });
    setEnCours(false);
    if (response.data?.success || !response.data?.error) {
      // Succès → session avec toutes les données disponibles + redirect vers EspaceVendeur
      sessionStorage.setItem("vendeur_session", JSON.stringify({
        email: vendeurEmail,
        nom_complet: form.nom_complet,
        role: 'vendeur',
        seller_status: 'kyc_required',
        email_verified: true,
      }));
      window.location.href = createPageUrl("EspaceVendeur");
    } else {
      setErreur(response.data?.error || "Erreur lors de la sauvegarde du profil.");
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
       // Mettre à jour le compte existant avec les documents KYC
       // Le compte seller existe déjà depuis l'étape 1, juste mettre à jour les docs
       const response = await base44.functions.invoke('updateKYCDocuments', {
         email: vendeurEmail,
         photo_identite_url: form.photo_identite_url,
         photo_identite_verso_url: form.photo_identite_verso_url || "",
         selfie_url: form.selfie_url,
       });

      if (response.data?.success) {
        setSucces(true);
      } else {
        setErreur(response.data?.error || "Erreur lors de la soumission. Veuillez réessayer.");
      }
    } catch (error) {
      setErreur(error.response?.data?.error || error.message || "Erreur lors de la soumission. Veuillez réessayer.");
    } finally {
      setEnCours(false);
    }
  };

  if (succes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Inscription réussie ! 🎉</h2>
          <p className="text-sm text-slate-500 mb-3">
            Votre compte a été créé et vos identifiants ont été envoyés par email.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-3">
            <p className="font-semibold mb-1">📧 Email reçu :</p>
            <p>Identifiants de connexion + instructions</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 mb-5">
            <p className="font-semibold mb-1">⏳ Prochaine étape :</p>
            <p>Notre équipe va vérifier votre dossier KYC sous <strong>24 à 48h</strong>. Vous recevrez un email de confirmation.</p>
          </div>
          <Link to={createPageUrl("Connexion")}>
            <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952]">
              Me connecter
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1240] to-[#1a1f5e] flex flex-col items-center justify-start px-4 py-8"
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top, 0px))" }}>

      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-6">
        <Link to={createPageUrl("Connexion")}>
          <button className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <img src={LOGO} alt="Zonite" className="h-8 w-8 rounded-xl object-contain bg-white p-0.5" />
          <div>
            <p className="text-white font-black text-sm leading-none">ZONITE</p>
            <p className="text-[#F5C518] text-[10px] font-semibold tracking-widest">VENDEURS</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Titre */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Créer mon compte vendeur</h1>
          <p className="text-slate-300 text-sm mt-1">Rejoignez le réseau de vente ZONITE</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-6">
          {ETAPES.map((e, i) => (
            <React.Fragment key={e.num}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  etape > e.num ? "bg-emerald-500 text-white" :
                  etape === e.num ? "bg-[#F5C518] text-[#1a1f5e]" :
                  "bg-white/10 text-slate-400"
                }`}>
                  {etape > e.num ? "✓" : e.num}
                </div>
                <span className={`text-[9px] font-medium whitespace-nowrap ${etape === e.num ? "text-[#F5C518]" : "text-slate-400"}`}>{e.label}</span>
              </div>
              {i < ETAPES.length - 1 && (
                <div className={`flex-1 h-0.5 mb-3 rounded ${etape > e.num ? "bg-emerald-500" : "bg-white/10"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {erreur && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-sm text-red-300">{erreur}</div>
        )}

        {/* ÉTAPE 1 : Compte */}
        {etape === 1 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 space-y-4">
            <h2 className="text-white font-bold">Mes informations de connexion</h2>
            <div>
              <Label className="text-slate-200 text-xs">Nom complet *</Label>
              <Input value={form.nom_complet} onChange={e => modifier("nom_complet", e.target.value)} placeholder="Jean Dupont" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
            </div>
            <div>
               <Label className="text-slate-200 text-xs">Email * <span className="text-slate-400">(servira d'identifiant)</span></Label>
               <div className="relative">
                 <Input type="email" value={form.email} onChange={e => { modifier("email", e.target.value); verifierEmail(e.target.value); }} placeholder="votre@email.com" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
                 {form.email && emailVerifie !== null && (
                   <div className={`text-xs mt-1 font-medium ${emailVerifie ? "text-emerald-400" : "text-red-400"}`}>
                     {emailVerifie ? "✓ Email disponible" : "✗ Email déjà utilisé"}
                   </div>
                 )}
               </div>
            </div>
            <div>
              <Label className="text-slate-200 text-xs">Téléphone *</Label>
              <Input value={form.telephone} onChange={e => modifier("telephone", e.target.value)} placeholder="+237 6XX XXX XXX" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
            </div>
            <div>
              <Label className="text-slate-200 text-xs">Mot de passe * <span className="text-slate-400">(min. 6 caractères)</span></Label>
              <div className="relative mt-1">
                <Input type={mdpVisible ? "text" : "password"} value={form.mot_de_passe} onChange={e => modifier("mot_de_passe", e.target.value)} placeholder="••••••••" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 pr-12" />
                <button type="button" onClick={() => setMdpVisible(!mdpVisible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-slate-200 text-xs">Confirmer le mot de passe *</Label>
              <Input type="password" value={form.confirmer_mdp} onChange={e => modifier("confirmer_mdp", e.target.value)} placeholder="••••••••" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
            </div>
            <Button onClick={validerEtape1} className="w-full h-11 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black rounded-xl">
              Continuer →
            </Button>
          </div>
        )}

        {/* ÉTAPE 2 : Vérification Email */}
        {etape === 2 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 space-y-4">
            <h2 className="text-white font-bold">Vérifier votre email</h2>
            <p className="text-slate-300 text-sm">Un code de vérification a été envoyé à <span className="font-semibold">{vendeurEmail}</span></p>
            
            <div>
              <Label className="text-slate-200 text-xs">Code de vérification (6 chiffres) *</Label>
              <Input 
                type="text" 
                maxLength="6"
                placeholder="000000" 
                value={form.verification_code} 
                onChange={e => modifier("verification_code", e.target.value.replace(/[^0-9]/g, ''))} 
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1 text-center text-2xl tracking-widest font-mono" 
              />
            </div>

            <div className="text-sm text-slate-300">
              <p>Vous n'avez pas reçu le code ?</p>
              <button 
                type="button"
                onClick={renvoyerCode}
                disabled={reenvoyerDisable || enCours}
                className="text-[#F5C518] hover:underline font-semibold disabled:opacity-50"
              >
                {reenvoyerDisable ? "Renvoyer dans 30s..." : "Renvoyer le code"}
              </button>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => { setEtape(1); setErreur(""); setVendeurEmail(""); }} 
                className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-xl h-11"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button 
                onClick={validerEtape2} 
                disabled={enCours || form.verification_code.length !== 6}
                className="flex-1 h-11 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black rounded-xl"
              >
                {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vérifier →"}
              </Button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Profil vendeur */}
        {etape === 3 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 space-y-4">
            <h2 className="text-white font-bold">Mon profil vendeur</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200 text-xs">Ville *</Label>
                <Input value={form.ville} onChange={e => modifier("ville", e.target.value)} placeholder="Douala" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Quartier *</Label>
                <Input value={form.quartier} onChange={e => modifier("quartier", e.target.value)} placeholder="Akwa" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-slate-200 text-xs">Opérateur Mobile Money *</Label>
              <Select value={form.operateur_mobile_money} onValueChange={v => modifier("operateur_mobile_money", v)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl h-11 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-200 text-xs">Numéro Mobile Money * <span className="text-slate-400">(pour recevoir vos commissions)</span></Label>
              <Input value={form.numero_mobile_money} onChange={e => modifier("numero_mobile_money", e.target.value)} placeholder="+237 6XX XXX XXX" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
            </div>
            <div>
              <Label className="text-slate-200 text-xs">Expérience en vente <span className="text-slate-400">(optionnel)</span></Label>
              <Input value={form.experience_vente} onChange={e => modifier("experience_vente", e.target.value)} placeholder="Ex: vente en ligne, boutique physique..." className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl h-11 mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEtape(2); setErreur(""); }} className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-xl h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button onClick={validerEtape3} disabled={enCours} className="flex-1 h-11 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black rounded-xl">
                {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accéder à mon espace →"}
              </Button>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : KYC — SUPPRIMÉE, maintenant dans EspaceVendeur */}
        {etape === 4 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 space-y-4">
            <div>
              <h2 className="text-white font-bold">Vérification d'identité (KYC)</h2>
              <p className="text-slate-300 text-xs mt-0.5">Ces documents permettent à notre équipe de valider votre compte.</p>
            </div>

            {/* Type de document */}
            <div>
              <Label className="text-slate-200 text-xs mb-2 block">Type de document *</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setTypeDocument("cni"); modifier("photo_identite_verso_url", ""); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${typeDocument === "cni" ? "bg-[#F5C518] text-[#1a1f5e] border-[#F5C518]" : "bg-white/5 text-slate-300 border-white/20 hover:bg-white/10"}`}
                >
                  🪪 CNI
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeDocument("passeport"); modifier("photo_identite_verso_url", ""); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${typeDocument === "passeport" ? "bg-[#F5C518] text-[#1a1f5e] border-[#F5C518]" : "bg-white/5 text-slate-300 border-white/20 hover:bg-white/10"}`}
                >
                  📘 Passeport
                </button>
              </div>
            </div>

            {/* Recto (ou page principale pour passeport) */}
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
                    <p className="text-slate-400 text-[10px]">Cliquez pour changer</p>
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

            {/* Verso CNI uniquement */}
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
                      <p className="text-slate-400 text-[10px]">Cliquez pour changer</p>
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

            {/* Selfie */}
            <div>
              <Label className="text-slate-200 text-xs mb-1.5 block">Selfie avec votre pièce d'identité *</Label>

              {/* Exemple visuel */}
              <div className="mb-2 bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                <div className="relative flex-shrink-0 w-20 h-20">
                  {/* Illustration selfie avec ID */}
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/20 flex flex-col items-center justify-center overflow-hidden relative">
                    {/* Visage */}
                    <div className="w-10 h-10 rounded-full bg-amber-300 flex items-center justify-center mb-1 relative">
                      <div className="w-5 h-2 bg-amber-400 rounded-full absolute bottom-2" />
                      <div className="w-1.5 h-1.5 bg-slate-700 rounded-full absolute" style={{top:'10px',left:'9px'}} />
                      <div className="w-1.5 h-1.5 bg-slate-700 rounded-full absolute" style={{top:'10px',right:'9px'}} />
                    </div>
                    {/* Carte ID */}
                    <div className="w-14 h-8 rounded bg-blue-400 border border-blue-300 flex items-center justify-center shadow-md">
                      <div className="w-4 h-4 rounded-full bg-blue-200 mr-1" />
                      <div className="flex flex-col gap-0.5">
                        <div className="w-5 h-1 bg-white/80 rounded" />
                        <div className="w-4 h-1 bg-white/60 rounded" />
                      </div>
                    </div>
                    {/* Checkmark vert */}
                    <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✓</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white text-xs font-semibold mb-1">Comment prendre votre selfie :</p>
                  <ul className="space-y-0.5 text-slate-300 text-[10px]">
                    <li>📸 Votre visage bien visible</li>
                    <li>🪪 Tenez votre CNI/passeport devant vous</li>
                    <li>💡 Bonne luminosité, fond neutre</li>
                    <li>❌ Pas de lunettes de soleil</li>
                  </ul>
                </div>
              </div>

              <label htmlFor="selfie" className={`flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${form.selfie_url ? "border-emerald-400 bg-emerald-500/10" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
                {uploadEnCours.selfie ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : form.selfie_url ? (
                  <div className="text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-emerald-300 text-xs font-medium">Selfie uploadé ✓</p>
                    <p className="text-slate-400 text-[10px]">Cliquez pour changer</p>
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

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEtape(3); setErreur(""); }} className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-xl h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button onClick={soumettre} disabled={enCours || uploadEnCours.id || uploadEnCours.selfie} className="flex-1 h-11 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-black rounded-xl">
                {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Soumettre mon dossier"}
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-slate-400 text-xs mt-5">
          Déjà un compte ?{" "}
          <Link to={createPageUrl("Connexion")} className="text-[#F5C518] font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}