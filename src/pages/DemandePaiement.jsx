import React, { useState, useEffect } from "react";
import { getVendeurSession } from "@/components/useSessionGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { vendeurApi } from "@/components/vendeurApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, ChevronLeft, Wallet, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BanniereKycPending from "@/components/BanniereKycPending";

const STATUTS_PAIEMENT = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800" },
  paye: { label: "Payé ✓", couleur: "bg-emerald-100 text-emerald-800" },
  rejete: { label: "Rejeté", couleur: "bg-red-100 text-red-800" },
};

export default function DemandePaiement() {
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [form, setForm] = useState({ montant: "", numero_mobile_money: "", operateur: "orange_money" });
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const charger = async () => {
      const session = getVendeurSession();
      if (!session) {
        window.location.href = createPageUrl("Connexion");
        return;
      }
      const sellers = await base44.entities.Seller.filter({ email: session.email });
      if (sellers.length > 0) {
        setCompteVendeur(sellers[0]);
        setForm(f => ({
          ...f,
          numero_mobile_money: sellers[0].numero_mobile_money || "",
          operateur: sellers[0].operateur_mobile_money || "orange_money",
        }));
      }
    };
    charger();
  }, []);

  const { data: demandes = [] } = useQuery({
    queryKey: ["demandes_paiement", compteVendeur?.id],
    queryFn: () => base44.entities.DemandePaiementVendeur.filter({ vendeur_id: compteVendeur.id }, "-created_date", 20),
    enabled: !!compteVendeur?.id,
  });

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const soumettre = async () => {
    const montant = parseFloat(form.montant);
    if (!montant || montant < 5000) return setErreur("Montant minimum : 5 000 FCFA");
    if (montant > (compteVendeur.solde_commission || 0)) return setErreur("Montant supérieur à votre solde disponible");
    if (!form.numero_mobile_money) return setErreur("Renseignez votre numéro Mobile Money");

    setEnCours(true);
    setErreur("");

    await vendeurApi.createDemandePaiement({
      vendeur_id: compteVendeur.id,
      vendeur_nom: compteVendeur.nom_complet,
      vendeur_email: compteVendeur.email,
      montant,
      numero_mobile_money: form.numero_mobile_money,
      operateur: form.operateur === "orange_money" ? "Orange Money" : "MTN MoMo",
      statut: "en_attente",
    });

    queryClient.invalidateQueries({ queryKey: ["demandes_paiement"] });
    setEnCours(false);
    setSucces(true);
  };

  if (succes) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Demande envoyée !</h2>
          <p className="text-sm text-slate-500 mb-4">L'équipe ZONITE traitera votre demande rapidement. Vous serez notifié dès le paiement effectué.</p>
          <Link to={createPageUrl("EspaceVendeur")}>
            <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952]">Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {compteVendeur?.seller_status === "kyc_pending" && <BanniereKycPending />}
      <div className="bg-[#1a1f5e] text-white px-4 pb-6" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">Demander un paiement</h1>
        </div>
        <div className="bg-white/10 rounded-2xl p-4">
          <p className="text-slate-300 text-xs">Solde disponible</p>
          <p className="text-3xl font-bold text-[#F5C518]">{formater(compteVendeur?.solde_commission)}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {erreur && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{erreur}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">Nouvelle demande</h2>
          <div className="space-y-1">
            <Label>Montant (FCFA) *</Label>
            <Input type="number" min="5000" value={form.montant} onFocus={e => e.target.select()}
              onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Min. 5 000 FCFA" />
          </div>
          <div className="space-y-1">
            <Label>Opérateur *</Label>
            <Select value={form.operateur} onValueChange={v => setForm(f => ({ ...f, operateur: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="orange_money">Orange Money</SelectItem>
                <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Numéro de réception *</Label>
            <Input value={form.numero_mobile_money} onChange={e => setForm(f => ({ ...f, numero_mobile_money: e.target.value }))} placeholder="+237 6XX XXX XXX" />
          </div>
          <Button onClick={soumettre} disabled={enCours || (compteVendeur?.solde_commission || 0) < 5000}
            className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
            {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wallet className="w-4 h-4 mr-2" />Envoyer la demande</>}
          </Button>
        </div>

        {/* Historique */}
        {demandes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Historique des demandes</h3>
            </div>
            {demandes.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-bold text-slate-900">{formater(d.montant)}</p>
                  <p className="text-xs text-slate-400">{d.operateur} • {d.numero_mobile_money}</p>
                  <p className="text-xs text-slate-400">{formaterDate(d.created_date)}</p>
                </div>
                <Badge className={`${STATUTS_PAIEMENT[d.statut]?.couleur} border-0 text-xs`}>
                  {STATUTS_PAIEMENT[d.statut]?.label}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}