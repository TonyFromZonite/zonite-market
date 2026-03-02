import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

const init = {
  nom_complet: "", numero_whatsapp: "", email: "",
  ville: "", experience_vente: "", motivation: ""
};

export default function Candidature() {
  const [form, setForm] = useState(init);
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState("");

  const modifier = (champ, val) => setForm(p => ({ ...p, [champ]: val }));

  const soumettre = async () => {
    if (!form.nom_complet || !form.numero_whatsapp || !form.email || !form.ville) {
      setErreur("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setEnCours(true);
    setErreur("");
    await base44.entities.CandidatureVendeur.create({ ...form, statut: "en_attente" });
    setSucces(true);
    setEnCours(false);
  };

  if (succes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1f5e] to-[#2d34a5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Candidature envoyée !</h2>
          <p className="text-slate-500 text-sm">
            Votre candidature a été reçue. Notre équipe l'examinera et vous contactera via WhatsApp sous 48h.
          </p>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            📱 Gardez votre WhatsApp actif : <strong>{form.numero_whatsapp}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f5e] to-[#2d34a5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg"
            alt="Zonite"
            className="h-14 w-14 rounded-xl object-contain mx-auto mb-3"
          />
          <h1 className="text-xl font-bold text-[#1a1f5e]">Devenir Vendeur ZONITE</h1>
          <p className="text-sm text-slate-500 mt-1">Rejoignez notre réseau de vendeurs et gagnez des commissions</p>
        </div>

        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erreur}</div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nom complet *</Label>
              <Input value={form.nom_complet} onChange={e => modifier("nom_complet", e.target.value)} placeholder="Votre nom complet" />
            </div>
            <div className="space-y-1">
              <Label>Numéro WhatsApp *</Label>
              <Input value={form.numero_whatsapp} onChange={e => modifier("numero_whatsapp", e.target.value)} placeholder="+237 6XX XXX XXX" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => modifier("email", e.target.value)} placeholder="votre@email.com" />
            </div>
            <div className="space-y-1">
              <Label>Ville *</Label>
              <Input value={form.ville} onChange={e => modifier("ville", e.target.value)} placeholder="Douala, Yaoundé..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Expérience en vente</Label>
            <Input value={form.experience_vente} onChange={e => modifier("experience_vente", e.target.value)} placeholder="Ex: 2 ans de vente en ligne, vente physique..." />
          </div>
          <div className="space-y-1">
            <Label>Motivation</Label>
            <Textarea value={form.motivation} onChange={e => modifier("motivation", e.target.value)} placeholder="Pourquoi voulez-vous rejoindre ZONITE ?" rows={3} />
          </div>
        </div>

        <Button
          onClick={soumettre}
          disabled={enCours}
          className="w-full mt-6 h-12 bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold text-base"
        >
          {enCours ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer ma candidature"}
        </Button>
        <p className="text-center text-xs text-slate-400 mt-3">
          Vous recevrez une réponse via WhatsApp sous 48 heures ouvrables.
        </p>
      </div>
    </div>
  );
}