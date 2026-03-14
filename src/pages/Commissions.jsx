import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wallet, DollarSign, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Commissions() {
  const [dialogPaiement, setDialogPaiement] = useState(false);
  const [vendeurPaiement, setVendeurPaiement] = useState(null);
  const [montantPaiement, setMontantPaiement] = useState(0);
  const [methodePaiement, setMethodePaiement] = useState("especes");
  const [notesPaiement, setNotesPaiement] = useState("");
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendeurs = [], isLoading: chargementVendeurs } = useQuery({
    queryKey: ["vendeurs"],
    queryFn: () => base44.entities.Seller.list(),
  });

  const { data: paiements = [], isLoading: chargementPaiements } = useQuery({
    queryKey: ["paiements_commissions"],
    queryFn: () => base44.entities.PaiementCommission.list("-created_date", 100),
  });

  const ouvrirPaiement = (vendeur) => {
    setVendeurPaiement(vendeur);
    setMontantPaiement(vendeur.solde_commission || 0);
    setMethodePaiement("especes");
    setNotesPaiement("");
    setDialogPaiement(true);
  };

  const payerCommission = async () => {
    if (!vendeurPaiement || montantPaiement <= 0) return;
    setEnCours(true);

    await base44.entities.PaiementCommission.create({
      vendeur_id: vendeurPaiement.id,
      vendeur_nom: vendeurPaiement.nom_complet,
      montant: montantPaiement,
      methode_paiement: methodePaiement,
      notes: notesPaiement,
    });

    await base44.entities.Seller.update(vendeurPaiement.id, {
      solde_commission: Math.max(0, (vendeurPaiement.solde_commission || 0) - montantPaiement),
      total_commissions_payees: (vendeurPaiement.total_commissions_payees || 0) + montantPaiement,
    });

    await base44.entities.JournalAudit.create({
      action: "Commission payée",
      module: "paiement",
      details: `Paiement de ${montantPaiement} FCFA à ${vendeurPaiement.nom_complet} (${methodePaiement})`,
      entite_id: vendeurPaiement.id,
    });

    queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
    queryClient.invalidateQueries({ queryKey: ["paiements_commissions"] });
    setDialogPaiement(false);
    setEnCours(false);
  };

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const formaterDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const totalAPayer = vendeurs.reduce((s, v) => s + (v.solde_commission || 0), 0);

  if (chargementVendeurs || chargementPaiements) {
    return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-50">
              <Wallet className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total à Payer</p>
              <p className="text-xl font-bold text-slate-900">{formater(totalAPayer)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-50">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Payé</p>
              <p className="text-xl font-bold text-slate-900">
                {formater(vendeurs.reduce((s, v) => s + (v.total_commissions_payees || 0), 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Gagné</p>
              <p className="text-xl font-bold text-slate-900">
                {formater(vendeurs.reduce((s, v) => s + (v.total_commissions_gagnees || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Soldes vendeurs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Soldes des Vendeurs</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Vendeur</TableHead>
                <TableHead className="text-right">Gagné</TableHead>
                <TableHead className="text-right">Payé</TableHead>
                <TableHead className="text-right">Solde à Payer</TableHead>
                <TableHead className="w-32">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendeurs.filter(v => v.statut === "actif").map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{v.nom_complet}</TableCell>
                  <TableCell className="text-right text-sm">{formater(v.total_commissions_gagnees)}</TableCell>
                  <TableCell className="text-right text-sm">{formater(v.total_commissions_payees)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${(v.solde_commission || 0) > 0 ? "text-yellow-600" : "text-emerald-600"}`}>
                      {formater(v.solde_commission)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={(v.solde_commission || 0) <= 0}
                      onClick={() => ouvrirPaiement(v)}
                      className="bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold"
                    >
                      Payer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Historique des Paiements</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-400">Aucun paiement enregistré</TableCell></TableRow>
              )}
              {paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{formaterDate(p.created_date)}</TableCell>
                  <TableCell className="font-medium">{p.vendeur_nom}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formater(p.montant)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {p.methode_paiement?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{p.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogue paiement */}
      <Dialog open={dialogPaiement} onOpenChange={setDialogPaiement}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payer la Commission</DialogTitle>
          </DialogHeader>
          {vendeurPaiement && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Vendeur: <span className="font-bold text-slate-900">{vendeurPaiement.nom_complet}</span></p>
                <p className="text-sm text-slate-600">Solde actuel: <span className="font-bold text-yellow-600">{formater(vendeurPaiement.solde_commission)}</span></p>
              </div>
              <div className="space-y-2">
                <Label>Montant à Payer (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  max={vendeurPaiement.solde_commission || 0}
                  value={montantPaiement}
                  onChange={(e) => setMontantPaiement(parseFloat(e.target.value) || 0)}
                />
                {montantPaiement > (vendeurPaiement.solde_commission || 0) && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    Le montant dépasse le solde
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Méthode de Paiement</Label>
                <Select value={methodePaiement} onValueChange={setMethodePaiement}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={notesPaiement} onChange={(e) => setNotesPaiement(e.target.value)} placeholder="Notes optionnelles..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPaiement(false)}>Annuler</Button>
            <Button
              onClick={payerCommission}
              disabled={enCours || montantPaiement <= 0 || montantPaiement > (vendeurPaiement?.solde_commission || 0)}
              className="bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold"
            >
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer le Paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}