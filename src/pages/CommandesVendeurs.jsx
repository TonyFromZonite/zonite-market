import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye } from "lucide-react";

const STATUTS = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  en_preparation: { label: "En préparation", couleur: "bg-blue-100 text-blue-800 border-blue-200" },
  en_livraison: { label: "En livraison", couleur: "bg-purple-100 text-purple-800 border-purple-200" },
  livree: { label: "Livrée", couleur: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  echec: { label: "Échec", couleur: "bg-red-100 text-red-800 border-red-200" },
};

const TRANSITIONS = {
  en_attente: ["en_preparation", "echec"],
  en_preparation: ["en_livraison", "echec"],
  en_livraison: ["livree", "echec"],
  livree: [],
  echec: [],
};

export default function CommandesVendeurs() {
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null);
  const [notesAdmin, setNotesAdmin] = useState("");
  const queryClient = useQueryClient();

  const { data: commandes = [], isLoading } = useQuery({
    queryKey: ["commandes_vendeurs_admin"],
    queryFn: () => base44.entities.CommandeVendeur.list("-created_date", 200),
  });

  const changerStatut = async (commande, statut) => {
    await base44.entities.CommandeVendeur.update(commande.id, { statut, notes_admin: notesAdmin || commande.notes_admin });
    await base44.entities.NotificationVendeur.create({
      vendeur_email: commande.vendeur_email,
      titre: `Commande ${STATUTS[statut]?.label}`,
      message: `Votre commande de ${commande.produit_nom} pour ${commande.client_nom} est maintenant : ${STATUTS[statut]?.label}.`,
      type: statut === "livree" ? "succes" : statut === "echec" ? "alerte" : "info",
    });

    if (statut === "livree") {
      const comptes = await base44.entities.CompteVendeur.filter({ id: commande.vendeur_id });
      if (comptes.length > 0) {
        const compte = comptes[0];
        await base44.entities.CompteVendeur.update(compte.id, {
          solde_commission: (compte.solde_commission || 0) + (commande.commission_vendeur || 0),
          total_commissions_gagnees: (compte.total_commissions_gagnees || 0) + (commande.commission_vendeur || 0),
          ventes_reussies: (compte.ventes_reussies || 0) + 1,
        });
      }
    }
    if (statut === "echec") {
      const comptes = await base44.entities.CompteVendeur.filter({ id: commande.vendeur_id });
      if (comptes.length > 0) {
        const compte = comptes[0];
        await base44.entities.CompteVendeur.update(compte.id, {
          ventes_echouees: (compte.ventes_echouees || 0) + 1,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["commandes_vendeurs_admin"] });
    setCommandeSelectionnee(null);
  };

  const commandesFiltrees = commandes.filter(c => {
    const texte = `${c.produit_nom} ${c.vendeur_nom} ${c.client_nom} ${c.client_ville}`.toLowerCase();
    return (filtreStatut === "tous" || c.statut === filtreStatut) && (!recherche || texte.includes(recherche.toLowerCase()));
  });

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";

  if (isLoading) return <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtreStatut} onValueChange={v => setFiltreStatut(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {commandesFiltrees.length === 0 && (
          <div className="p-8 text-center text-slate-400">Aucune commande</div>
        )}
        {commandesFiltrees.map(c => (
          <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => { setCommandeSelectionnee(c); setNotesAdmin(c.notes_admin || ""); }}>
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-medium text-sm text-slate-900 truncate">{c.produit_nom}</p>
              <p className="text-xs text-slate-500">{c.vendeur_nom} → {c.client_nom} ({c.client_ville})</p>
              <p className="text-xs text-slate-400">{formaterDate(c.created_date)} • Commission: {formater(c.commission_vendeur)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${STATUTS[c.statut]?.couleur} border text-xs`}>{STATUTS[c.statut]?.label}</Badge>
              <Eye className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!commandeSelectionnee} onOpenChange={() => setCommandeSelectionnee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Commande : {commandeSelectionnee?.produit_nom}</DialogTitle>
          </DialogHeader>
          {commandeSelectionnee && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-slate-400">Vendeur</p><p className="font-medium">{commandeSelectionnee.vendeur_nom}</p></div>
                <div><p className="text-slate-400">Quantité</p><p className="font-medium">{commandeSelectionnee.quantite}</p></div>
                <div><p className="text-slate-400">Prix client</p><p className="font-bold">{formater(commandeSelectionnee.prix_final_client)}</p></div>
                <div><p className="text-slate-400">Commission vendeur</p><p className="font-bold text-yellow-600">{formater(commandeSelectionnee.commission_vendeur)}</p></div>
                <div><p className="text-slate-400">Client</p><p className="font-medium">{commandeSelectionnee.client_nom}</p></div>
                <div><p className="text-slate-400">Téléphone</p><p className="font-medium">{commandeSelectionnee.client_telephone}</p></div>
                <div className="col-span-2"><p className="text-slate-400">Adresse</p><p className="font-medium">{commandeSelectionnee.client_ville}, {commandeSelectionnee.client_quartier} – {commandeSelectionnee.client_adresse || "—"}</p></div>
                {commandeSelectionnee.notes && <div className="col-span-2"><p className="text-slate-400">Notes vendeur</p><p>{commandeSelectionnee.notes}</p></div>}
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">Note admin</label>
                <Input value={notesAdmin} onChange={e => setNotesAdmin(e.target.value)} placeholder="Message au vendeur..." />
              </div>
              {TRANSITIONS[commandeSelectionnee.statut]?.length > 0 && (
                <div>
                  <p className="text-slate-400 mb-2">Changer le statut :</p>
                  <div className="flex flex-wrap gap-2">
                    {TRANSITIONS[commandeSelectionnee.statut].map(s => (
                      <Button key={s} size="sm"
                        className={s === "echec" ? "bg-red-600 hover:bg-red-700" : "bg-[#1a1f5e] hover:bg-[#141952]"}
                        onClick={() => changerStatut(commandeSelectionnee, s)}>
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