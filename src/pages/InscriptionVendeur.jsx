import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function InscriptionVendeur() {
  const [etape, setEtape] = useState(1);
  const [utilisateur, setUtilisateur] = useState(null);
  const [form, setForm] = useState({
    nom_complet: "", telephone: "", ville: "", quartier: "",
    numero_mobile_money: "", operateur_mobile_money: "orange_money",
    photo_identite_url: "", selfie_url: "",
  });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUtilisateur(u);
      setForm(f => ({ ...f, nom_complet: u.full_name || "" }));
    });
  }, []);

  const modifier = (champ, val) => setForm(p => ({ ...p, [champ]: val }));

  const uploadFichier = async (fichier, champ) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file: fichier });
    modifier(champ, file_url);
  };

  const soumettreEtape1 = () => {
    if (!form.nom_complet || !form.telephone || !form.ville || !form.quartier) {
      setErreur("Remplissez tous les champs obligatoires.");
      return;
    }
    setErreur("");
    setEtape(2);
  };

  const soumettre = async () => {
    if (!form.photo_identite_url || !form.selfie_url) {
      setErreur("Veuillez uploader votre pièce d'identité et votre selfie.");
      return;
    }
    if (!form.numero_mobile_money) {
      setErreur("Renseignez votre numéro Mobile Money.");
      return;
    }
    setEnCours(true);
    setErreur("");
    await base44.entities.CompteVendeur.create({
      ...form,
      user_email: utilisateur.email,
      statut_kyc: "en_attente",
      statut: "en_attente_kyc",
      video_vue: false,
      catalogue_debloque: false,
      solde_commission: 0,
      nombre_ventes: 0,
    });
    await base44.entities.NotificationVendeur.create({
      vendeur_email: utilisateur.email,
      titre: "Dossier reçu",
      message: "Votre dossier KYC a été soumis. Notre équipe le validera sous 24-48h.",
      type: "info",
    });
    setSucces(true);
    setEnCours(false);
  };

  if (!utilisateur) return null;

  if (succes) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Dossier soumis !</h2>
          <p className="text-sm text-slate-500 mb-4">Votre dossier KYC est en cours de validation. Vous recevrez une notification dès qu'il sera traité.</p>
          <Link to={createPageUrl("EspaceVendeur")}>
            <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952]">Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg"
            alt="Zonite" className="h-12 w-12 rounded-xl object-contain mx-auto mb-2"
          />
          <h1 className="text-lg font-bold text-[#1a1f5e]">Création du compte vendeur</h1>
        </div>

        {/* Indicateur d'étape */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map(n => (
            <React.Fragment key={n}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etape >= n ? "bg-[#1a1f5e] text-white" : "bg-slate-200 text-slate-500"}`}>
                {n}
              </div>
              {n < 2 && <div className={`flex-1 h-1 rounded ${etape > n ? "bg-[#1a1f5e]" : "bg-slate-200"}`} />}
            </React.Fragment>
          ))}
        </div>

        {erreur && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{erreur}</div>}

        {etape === 1 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Informations personnelles</h2>
            <div className="space-y-1">
              <Label>Nom complet *</Label>
              <Input value={form.nom_complet} onChange={e => modifier("nom_complet", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Téléphone *</Label>
              <Input value={form.telephone} onChange={e => modifier("telephone", e.target.value)} placeholder="+237 6XX XXX XXX" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ville *</Label>
                <Input value={form.ville} onChange={e => modifier("ville", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Quartier *</Label>
                <Input value={form.quartier} onChange={e => modifier("quartier", e.target.value)} />
              </div>
            </div>
            <Button onClick={soumettreEtape1} className="w-full bg-[#1a1f5e] hover:bg-[#141952]">
              Suivant →
            </Button>
          </div>
        )}

        {etape === 2 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Vérification d'identité (KYC)</h2>

            <div className="space-y-1">
              <Label>Photo de votre pièce d'identité *</Label>
              <div className={`border-2 border-dashed rounded-xl p-4 text-center ${form.photo_identite_url ? "border-emerald-400 bg-emerald-50" : "border-slate-300"}`}>
                {form.photo_identite_url ? (
                  <div className="text-emerald-600 text-sm">✓ Photo uploadée</div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-2">CNI, passeport ou permis</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" id="id-photo"
                  onChange={e => e.target.files[0] && uploadFichier(e.target.files[0], "photo_identite_url")} />
                <label htmlFor="id-photo">
                  <span className="text-xs text-blue-600 cursor-pointer underline">
                    {form.photo_identite_url ? "Changer la photo" : "Sélectionner un fichier"}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Selfie avec votre pièce d'identité *</Label>
              <div className={`border-2 border-dashed rounded-xl p-4 text-center ${form.selfie_url ? "border-emerald-400 bg-emerald-50" : "border-slate-300"}`}>
                {form.selfie_url ? (
                  <div className="text-emerald-600 text-sm">✓ Selfie uploadé</div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 mb-2">Tenez votre pièce à côté de votre visage</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" id="selfie"
                  onChange={e => e.target.files[0] && uploadFichier(e.target.files[0], "selfie_url")} />
                <label htmlFor="selfie">
                  <span className="text-xs text-blue-600 cursor-pointer underline">
                    {form.selfie_url ? "Changer le selfie" : "Sélectionner un fichier"}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Opérateur Mobile Money *</Label>
              <Select value={form.operateur_mobile_money} onValueChange={v => modifier("operateur_mobile_money", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Numéro Mobile Money *</Label>
              <Input value={form.numero_mobile_money} onChange={e => modifier("numero_mobile_money", e.target.value)} placeholder="+237 6XX XXX XXX" />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEtape(1)} className="flex-1">← Retour</Button>
              <Button onClick={soumettre} disabled={enCours} className="flex-1 bg-[#1a1f5e] hover:bg-[#141952]">
                {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Soumettre le dossier"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}