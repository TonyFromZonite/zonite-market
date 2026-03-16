import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUTS = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  confirmee: { label: "Confirmée", couleur: "bg-blue-100 text-blue-800 border-blue-200" },
  en_preparation: { label: "En préparation", couleur: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  expediee: { label: "Expédiée", couleur: "bg-purple-100 text-purple-800 border-purple-200" },
  livree: { label: "Livrée", couleur: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  annulee: { label: "Annulée", couleur: "bg-red-100 text-red-800 border-red-200" },
  retournee: { label: "Retournée", couleur: "bg-orange-100 text-orange-800 border-orange-200" },
};

const TRANSITIONS = {
  en_attente: ["confirmee", "annulee"],
  confirmee: ["en_preparation", "annulee"],
  en_preparation: ["expediee", "annulee"],
  expediee: ["livree", "retournee"],
  livree: [],
  annulee: [],
  retournee: [],
};

const PAR_PAGE = 15;

export default function Commandes() {
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [page, setPage] = useState(0);
  const [detailVente, setDetailVente] = useState(null);
  const queryClient = useQueryClient();

  const { data: ventes = [], isLoading } = useQuery({
    queryKey: ["ventes"],
    queryFn: () => base44.entities.Vente.list("-created_date", 500),
  });

  const changerStatut = async (vente, nouveauStatut) => {
    await adminApi.updateVente(vente.id, { statut_commande: nouveauStatut });
    await adminApi.createJournalAudit({
      action: `Statut commande changé: ${STATUTS[vente.statut_commande]?.label} → ${STATUTS[nouveauStatut]?.label}`,
      module: "commande",
      details: `Commande ${vente.produit_nom} – ${vente.client_nom || "Client"}`,
      entite_id: vente.id,
    });

    // Si annulée, restaurer le stock
    if (nouveauStatut === "annulee" && vente.statut_commande !== "annulee") {
      const produits = await base44.entities.Produit.list();
      const produit = produits.find(p => p.id === vente.produit_id);
      if (produit) {
        await adminApi.updateProduit(produit.id, {
          stock_actuel: (produit.stock_actuel || 0) + vente.quantite,
          total_vendu: Math.max(0, (produit.total_vendu || 0) - vente.quantite),
        });
        await adminApi.createMouvementStock({
          produit_id: produit.id,
          produit_nom: produit.nom,
          type_mouvement: "entree",
          quantite: vente.quantite,
          stock_avant: produit.stock_actuel || 0,
          stock_apres: (produit.stock_actuel || 0) + vente.quantite,
          raison: "Annulation de commande",
          reference_vente: vente.id,
        });
      }
      // Réduire commission vendeur via adminApi (service role)
      const resSellers = await base44.functions.invoke('getAllVendeurs', {});
      const allSellers = resSellers.data || [];
      const vendeur = allSellers.find(v => v.id === vente.vendeur_id);
      if (vendeur) {
        await adminApi.updateVendeur(vendeur.id, {
          solde_commission: Math.max(0, (vendeur.solde_commission || 0) - (vente.commission_vendeur || 0)),
          total_commissions_gagnees: Math.max(0, (vendeur.total_commissions_gagnees || 0) - (vente.commission_vendeur || 0)),
          nombre_ventes: Math.max(0, (vendeur.nombre_ventes || 0) - 1),
          chiffre_affaires_genere: Math.max(0, (vendeur.chiffre_affaires_genere || 0) - (vente.montant_total || 0)),
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["ventes"] });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
    queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
    setDetailVente(null);
  };

  const ventesFiltrees = ventes.filter((v) => {
    const texte = `${v.produit_nom} ${v.vendeur_nom} ${v.client_nom} ${v.client_telephone}`.toLowerCase();
    const matchRecherche = !recherche || texte.includes(recherche.toLowerCase());
    const matchStatut = filtreStatut === "tous" || v.statut_commande === filtreStatut;
    return matchRecherche && matchStatut;
  });

  const totalPages = Math.ceil(ventesFiltrees.length / PAR_PAGE);
  const ventesPage = ventesFiltrees.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const formaterDate = (d) => d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  if (isLoading) {
    return <div className="space-y-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par produit, vendeur, client..."
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={filtreStatut} onValueChange={(v) => { setFiltreStatut(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(STATUTS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventesPage.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    Aucune commande trouvée
                  </TableCell>
                </TableRow>
              )}
              {ventesPage.map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetailVente(v)}>
                  <TableCell className="text-sm">{formaterDate(v.date_vente || v.created_date)}</TableCell>
                  <TableCell className="font-medium">{v.produit_nom}</TableCell>
                  <TableCell>{v.vendeur_nom}</TableCell>
                  <TableCell>{v.client_nom || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formater(v.montant_total)}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUTS[v.statut_commande]?.couleur} border text-xs`}>
                      {STATUTS[v.statut_commande]?.label || v.statut_commande}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Eye className="w-4 h-4 text-slate-400" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">{ventesFiltrees.length} commande(s)</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogue détails */}
      <Dialog open={!!detailVente} onOpenChange={() => setDetailVente(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de la Commande</DialogTitle>
          </DialogHeader>
          {detailVente && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Produit:</span> <span className="font-medium">{detailVente.produit_nom}</span></div>
                <div><span className="text-slate-500">Quantité:</span> <span className="font-medium">{detailVente.quantite}</span></div>
                <div><span className="text-slate-500">Prix unitaire:</span> <span className="font-medium">{formater(detailVente.prix_unitaire)}</span></div>
                <div><span className="text-slate-500">Montant total:</span> <span className="font-medium">{formater(detailVente.montant_total)}</span></div>
                <div><span className="text-slate-500">Vendeur:</span> <span className="font-medium">{detailVente.vendeur_nom}</span></div>
                <div><span className="text-slate-500">Commission:</span> <span className="font-medium">{formater(detailVente.commission_vendeur)}</span></div>
                <div><span className="text-slate-500">Livraison:</span> <span className="font-medium">{detailVente.livraison_nom || "—"} ({formater(detailVente.cout_livraison)})</span></div>
                <div><span className="text-slate-500">Profit ZONITE:</span> <span className={`font-bold ${(detailVente.profit_zonite || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formater(detailVente.profit_zonite)}</span></div>
                <div><span className="text-slate-500">Client:</span> <span className="font-medium">{detailVente.client_nom || "—"}</span></div>
                <div><span className="text-slate-500">Tél:</span> <span className="font-medium">{detailVente.client_telephone || "—"}</span></div>
                <div className="col-span-2"><span className="text-slate-500">Adresse:</span> <span className="font-medium">{detailVente.client_adresse || "—"}</span></div>
                <div className="col-span-2"><span className="text-slate-500">Date:</span> <span className="font-medium">{formaterDate(detailVente.date_vente || detailVente.created_date)}</span></div>
                {detailVente.notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span className="font-medium">{detailVente.notes}</span></div>}
              </div>

              {/* Transitions de statut */}
              {TRANSITIONS[detailVente.statut_commande]?.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm text-slate-500 mb-2">Changer le statut :</p>
                  <div className="flex flex-wrap gap-2">
                    {TRANSITIONS[detailVente.statut_commande].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === "annulee" ? "destructive" : "default"}
                        className={s !== "annulee" ? "bg-[#1a1f5e] hover:bg-[#141952]" : ""}
                        onClick={() => changerStatut(detailVente, s)}
                      >
                        {STATUTS[s]?.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}