import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, RotateCcw, PackageCheck, XCircle, Loader2 } from "lucide-react";

const RAISONS = {
  defaut_produit:     "Défaut produit",
  mauvaise_livraison: "Mauvaise livraison",
  client_refuse:      "Client a refusé",
  autre:              "Autre",
};

const STATUTS = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  traite:     { label: "Traité ✓",   couleur: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejete:     { label: "Rejeté",     couleur: "bg-red-100 text-red-800 border-red-200" },
};

const ACTIONS_VENDEUR = {
  aucune:           "Aucune action",
  deduire_commission: "Déduire du solde",
  crediter_bonus:     "Créditer un bonus",
};

const fmt = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function RetoursAdmin() {
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [retourSelectionne, setRetourSelectionne] = useState(null);
  const [actionVendeur, setActionVendeur] = useState("aucune");
  const [montantAjustement, setMontantAjustement] = useState("");
  const [stockReintegre, setStockReintegre] = useState(true);
  const [notesAdmin, setNotesAdmin] = useState("");
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: retours = [], isLoading } = useQuery({
    queryKey: ["retours_admin"],
    queryFn: () => base44.entities.RetourProduit.list("-created_date", 200),
  });

  const nbEnAttente = retours.filter(r => r.statut === "en_attente").length;

  const ouvrirRetour = (r) => {
    setRetourSelectionne(r);
    setActionVendeur(r.action_vendeur || "aucune");
    setMontantAjustement(r.montant_ajustement || "");
    setStockReintegre(r.statut === "en_attente" ? true : (r.stock_reintegre || false));
    setNotesAdmin(r.notes_admin || "");
  };

  const traiterRetour = async () => {
    setEnCours(true);
    const montant = parseFloat(montantAjustement) || 0;

    // 1. Réintégrer le stock si demandé
    if (stockReintegre) {
      const [produit] = await base44.entities.Produit.filter({ id: retourSelectionne.produit_id });
      if (produit) {
        await base44.entities.Produit.update(produit.id, {
          stock_global: (produit.stock_global || 0) + retourSelectionne.quantite_retournee,
        });
        await base44.entities.MouvementStock.create({
          produit_id: produit.id,
          produit_nom: produit.nom,
          type_mouvement: "entree",
          quantite: retourSelectionne.quantite_retournee,
          stock_avant: produit.stock_global || 0,
          stock_apres: (produit.stock_global || 0) + retourSelectionne.quantite_retournee,
          raison: `Retour produit — ${RAISONS[retourSelectionne.raison]}`,
        });
      }
    }

    // 2. Ajuster le solde du vendeur
    if (actionVendeur !== "aucune" && montant > 0) {
      const [compte] = await base44.entities.CompteVendeur.filter({ id: retourSelectionne.vendeur_id });
      if (compte) {
        const delta = actionVendeur === "deduire_commission" ? -montant : montant;
        await base44.entities.CompteVendeur.update(compte.id, {
          solde_commission: Math.max(0, (compte.solde_commission || 0) + delta),
        });
      }
    }

    // 3. Mettre à jour le retour
    await base44.entities.RetourProduit.update(retourSelectionne.id, {
      statut: "traite",
      stock_reintegre: stockReintegre,
      action_vendeur: actionVendeur,
      montant_ajustement: montant,
      notes_admin: notesAdmin,
    });

    // 4. Notifier le vendeur
    let msgAction = "";
    if (actionVendeur === "deduire_commission" && montant > 0) msgAction = ` Déduction de ${fmt(montant)} sur votre solde.`;
    if (actionVendeur === "crediter_bonus" && montant > 0) msgAction = ` Crédit de ${fmt(montant)} sur votre solde.`;
    await base44.entities.NotificationVendeur.create({
      vendeur_email: retourSelectionne.vendeur_email,
      titre: "Retour produit traité",
      message: `Le retour de ${retourSelectionne.quantite_retournee}x ${retourSelectionne.produit_nom} a été traité.${msgAction}`,
      type: "info",
    });

    // 5. Journal
    await base44.entities.JournalAudit.create({
      action: "Retour produit traité",
      module: "commande",
      details: `Retour ${retourSelectionne.id} — ${retourSelectionne.produit_nom} × ${retourSelectionne.quantite_retournee} — Stock: ${stockReintegre ? "OUI" : "NON"} — Action vendeur: ${ACTIONS_VENDEUR[actionVendeur]}`,
      entite_id: retourSelectionne.id,
    });

    queryClient.invalidateQueries({ queryKey: ["retours_admin"] });
    setEnCours(false);
    setRetourSelectionne(null);
  };

  const rejeterRetour = async () => {
    setEnCours(true);
    await base44.entities.RetourProduit.update(retourSelectionne.id, {
      statut: "rejete",
      notes_admin: notesAdmin,
    });
    await base44.entities.NotificationVendeur.create({
      vendeur_email: retourSelectionne.vendeur_email,
      titre: "Retour produit rejeté",
      message: `Le retour de ${retourSelectionne.produit_nom} a été rejeté.${notesAdmin ? ` Raison : ${notesAdmin}` : ""}`,
      type: "alerte",
    });
    queryClient.invalidateQueries({ queryKey: ["retours_admin"] });
    setEnCours(false);
    setRetourSelectionne(null);
  };

  const retoursFiltres = retours.filter(r => {
    const texte = `${r.produit_nom} ${r.vendeur_nom}`.toLowerCase();
    return (filtreStatut === "tous" || r.statut === filtreStatut) && (!recherche || texte.includes(recherche.toLowerCase()));
  });

  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      {nbEnAttente > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">{nbEnAttente}</span>
          <p className="text-sm text-orange-800 font-medium">{nbEnAttente} retour{nbEnAttente > 1 ? "s" : ""} en attente de traitement</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous</SelectItem>
            {Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {retoursFiltres.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Aucun retour enregistré</p>
          </div>
        ) : retoursFiltres.map(r => (
          <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => ouvrirRetour(r)}>
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-medium text-sm text-slate-900 truncate">{r.produit_nom} <span className="text-slate-400 font-normal">× {r.quantite_retournee}</span></p>
              <p className="text-xs text-slate-500">{r.vendeur_nom} — {RAISONS[r.raison]}</p>
              <p className="text-xs text-slate-400">{formaterDate(r.created_date)}</p>
            </div>
            <Badge className={`${STATUTS[r.statut]?.couleur} border text-xs whitespace-nowrap`}>{STATUTS[r.statut]?.label}</Badge>
          </div>
        ))}
      </div>

      {/* Dialog traitement */}
      <Dialog open={!!retourSelectionne} onOpenChange={() => setRetourSelectionne(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-500" /> Retour : {retourSelectionne?.produit_nom}
            </DialogTitle>
          </DialogHeader>
          {retourSelectionne && (
            <div className="space-y-4 text-sm">
              <Badge className={`${STATUTS[retourSelectionne.statut]?.couleur} border`}>{STATUTS[retourSelectionne.statut]?.label}</Badge>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
                <div><p className="text-slate-400 text-xs">Vendeur</p><p className="font-medium">{retourSelectionne.vendeur_nom}</p></div>
                <div><p className="text-slate-400 text-xs">Quantité retournée</p><p className="font-bold text-orange-600">{retourSelectionne.quantite_retournee}</p></div>
                <div className="col-span-2"><p className="text-slate-400 text-xs">Raison</p><p className="font-medium">{RAISONS[retourSelectionne.raison]}</p></div>
                {retourSelectionne.raison_detail && (
                  <div className="col-span-2"><p className="text-slate-400 text-xs">Détail</p><p>{retourSelectionne.raison_detail}</p></div>
                )}
              </div>

              {retourSelectionne.statut === "en_attente" && (
                <>
                  {/* Réintégration stock */}
                  <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                    <p className="font-medium text-slate-700">Gestion du stock</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={stockReintegre} onChange={e => setStockReintegre(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                      <span className="text-slate-700">Réintégrer {retourSelectionne.quantite_retournee} unité(s) en stock</span>
                    </label>
                  </div>

                  {/* Action vendeur */}
                  <div className="border border-slate-200 rounded-xl p-3 space-y-3">
                    <p className="font-medium text-slate-700">Action sur le solde du vendeur</p>
                    <Select value={actionVendeur} onValueChange={setActionVendeur}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTIONS_VENDEUR).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {actionVendeur !== "aucune" && (
                      <div className="space-y-1">
                        <label className="text-slate-500 text-xs font-medium">Montant (FCFA)</label>
                        <Input
                          type="number"
                          value={montantAjustement}
                          onChange={e => setMontantAjustement(e.target.value)}
                          placeholder="0"
                          min="0"
                        />
                        {actionVendeur === "deduire_commission" && montantAjustement && (
                          <p className="text-xs text-red-600">⚠ {fmt(montantAjustement)} seront déduits du solde du vendeur</p>
                        )}
                        {actionVendeur === "crediter_bonus" && montantAjustement && (
                          <p className="text-xs text-emerald-600">✓ {fmt(montantAjustement)} seront crédités sur le solde du vendeur</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-slate-500 text-xs font-medium">Note pour le vendeur</label>
                    <Textarea value={notesAdmin} onChange={e => setNotesAdmin(e.target.value)} placeholder="Explication du traitement..." rows={2} />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={traiterRetour} disabled={enCours} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2">
                      {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />} Valider le traitement
                    </Button>
                    <Button onClick={rejeterRetour} disabled={enCours} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2">
                      <XCircle className="w-4 h-4" /> Rejeter
                    </Button>
                  </div>
                </>
              )}

              {retourSelectionne.statut !== "en_attente" && retourSelectionne.notes_admin && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs mb-1">Note admin</p>
                  <p>{retourSelectionne.notes_admin}</p>
                  {retourSelectionne.stock_reintegre && <p className="text-emerald-600 text-xs mt-1">✓ Stock réintégré</p>}
                  {retourSelectionne.action_vendeur !== "aucune" && (
                    <p className="text-xs mt-1">{ACTIONS_VENDEUR[retourSelectionne.action_vendeur]} : {fmt(retourSelectionne.montant_ajustement)}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}