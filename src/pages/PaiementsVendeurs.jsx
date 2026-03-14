import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Wallet } from "lucide-react";

const STATUTS = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800" },
  paye: { label: "Payé ✓", couleur: "bg-emerald-100 text-emerald-800" },
  rejete: { label: "Rejeté", couleur: "bg-red-100 text-red-800" },
};

export default function PaiementsVendeurs() {
  const queryClient = useQueryClient();

  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ["demandes_paiement_admin"],
    queryFn: () => base44.entities.DemandePaiementVendeur.list("-created_date"),
  });

  const marquerPaye = async (demande) => {
    await adminApi.updateDemandePaiement(demande.id, { statut: "paye" });

    const sellers = await base44.entities.Seller.filter({ email: demande.vendeur_email });
    if (sellers.length > 0) {
      const seller = sellers[0];
      await base44.asServiceRole.entities.Seller.update(seller.id, {
        solde_commission: Math.max(0, (seller.solde_commission || 0) - demande.montant),
        total_commissions_payees: (seller.total_commissions_payees || 0) + demande.montant,
      });
    }

    await adminApi.createNotificationVendeur({
      vendeur_email: demande.vendeur_email,
      titre: "Paiement effectué !",
      message: `Votre paiement de ${demande.montant.toLocaleString("fr-FR")} FCFA a été envoyé sur votre numéro ${demande.numero_mobile_money} (${demande.operateur}).`,
      type: "paiement",
    });

    queryClient.invalidateQueries({ queryKey: ["demandes_paiement_admin"] });
  };

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  if (isLoading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  const enAttente = demandes.filter(d => d.statut === "en_attente");
  const traitees = demandes.filter(d => d.statut !== "en_attente");
  const totalEnAttente = enAttente.reduce((s, d) => s + (d.montant || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 bg-yellow-50 rounded-xl"><Wallet className="w-5 h-5 text-yellow-600" /></div>
          <div>
            <p className="text-sm text-slate-500">À payer maintenant</p>
            <p className="text-xl font-bold text-yellow-600">{formater(totalEnAttente)}</p>
            <p className="text-xs text-slate-400">{enAttente.length} demande{enAttente.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <p className="text-sm text-slate-500">Total payé</p>
            <p className="text-xl font-bold text-emerald-600">{formater(traitees.filter(d => d.statut === "paye").reduce((s, d) => s + d.montant, 0))}</p>
          </div>
        </div>
      </div>

      {enAttente.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-yellow-50 border-yellow-100">
            <h3 className="font-semibold text-slate-900">Demandes à traiter ({enAttente.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {enAttente.map(d => (
              <div key={d.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{formater(d.montant)}</p>
                  <p className="text-sm text-slate-700 font-medium">{d.vendeur_nom}</p>
                  <p className="text-xs text-slate-500">{d.operateur} : {d.numero_mobile_money}</p>
                  <p className="text-xs text-slate-400">{formaterDate(d.created_date)}</p>
                </div>
                <Button size="sm" onClick={() => marquerPaye(d)} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Payé
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {traitees.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Historique ({traitees.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {traitees.map(d => (
              <div key={d.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold">{formater(d.montant)}</p>
                  <p className="text-sm text-slate-600">{d.vendeur_nom} • {d.operateur}</p>
                  <p className="text-xs text-slate-400">{formaterDate(d.created_date)}</p>
                </div>
                <Badge className={`${STATUTS[d.statut]?.couleur} border-0`}>{STATUTS[d.statut]?.label}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {demandes.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">Aucune demande de paiement</div>
      )}
    </div>
  );
}