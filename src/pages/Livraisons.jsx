import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Loader2, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const initLivraison = { nom: "", cout: 0, delai_estime: "", statut: "actif" };

export default function Livraisons() {
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [livraisonEditee, setLivraisonEditee] = useState(null);
  const [form, setForm] = useState(initLivraison);
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: livraisons = [], isLoading } = useQuery({
    queryKey: ["livraisons"],
    queryFn: () => base44.entities.Livraison.list("-created_date"),
  });

  const modifier = (champ, valeur) => setForm((p) => ({ ...p, [champ]: valeur }));

  const ouvrir = (l) => {
    if (l) {
      setLivraisonEditee(l);
      setForm({ ...initLivraison, ...l });
    } else {
      setLivraisonEditee(null);
      setForm(initLivraison);
    }
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    setEnCours(true);
    if (livraisonEditee) {
      await base44.entities.Livraison.update(livraisonEditee.id, form);
      await base44.entities.JournalAudit.create({ action: "Livraison modifiée", module: "livraison", details: `Livraison ${form.nom} modifiée`, entite_id: livraisonEditee.id });
    } else {
      await base44.entities.Livraison.create(form);
      await base44.entities.JournalAudit.create({ action: "Livraison créée", module: "livraison", details: `Nouvelle livraison: ${form.nom}` });
    }
    queryClient.invalidateQueries({ queryKey: ["livraisons"] });
    setDialogOuvert(false);
    setEnCours(false);
  };

  const supprimer = async (l) => {
    if (!confirm(`Supprimer la livraison "${l.nom}" ?`)) return;
    await base44.entities.Livraison.delete(l.id);
    await base44.entities.JournalAudit.create({ action: "Livraison supprimée", module: "livraison", details: `Livraison ${l.nom} supprimée`, entite_id: l.id });
    queryClient.invalidateQueries({ queryKey: ["livraisons"] });
  };

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} DA`;

  if (isLoading) {
    return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => ouvrir(null)} className="bg-[#1a1f5e] hover:bg-[#141952]">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle Livraison
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead>Délai Estimé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {livraisons.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Aucune méthode de livraison</TableCell></TableRow>
              )}
              {livraisons.map((l) => (
                <TableRow key={l.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{l.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formater(l.cout)}</TableCell>
                  <TableCell className="text-sm text-slate-600">{l.delai_estime || "—"}</TableCell>
                  <TableCell>
                    <Badge className={l.statut === "actif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                      {l.statut === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => ouvrir(l)}>
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => supprimer(l)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{livraisonEditee ? "Modifier la Livraison" : "Nouvelle Livraison"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => modifier("nom", e.target.value)} placeholder="Ex: Livraison Express" /></div>
            <div className="space-y-2"><Label>Coût (DA) *</Label><Input type="number" min="0" value={form.cout} onChange={(e) => modifier("cout", parseFloat(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label>Délai Estimé</Label><Input value={form.delai_estime} onChange={(e) => modifier("delai_estime", e.target.value)} placeholder="Ex: 2-3 jours" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : livraisonEditee ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}