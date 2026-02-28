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
import { Plus, Pencil, Trash2, Loader2, Search, UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const initVendeur = {
  nom_complet: "", email: "", telephone: "",
  statut: "actif", date_embauche: new Date().toISOString().split("T")[0],
};

export default function Vendeurs() {
  const [recherche, setRecherche] = useState("");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [vendeurEdite, setVendeurEdite] = useState(null);
  const [form, setForm] = useState(initVendeur);
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendeurs = [], isLoading } = useQuery({
    queryKey: ["vendeurs"],
    queryFn: () => base44.entities.Vendeur.list("-created_date"),
  });

  const modifier = (champ, valeur) => setForm((p) => ({ ...p, [champ]: valeur }));

  const ouvrir = (vendeur) => {
    if (vendeur) {
      setVendeurEdite(vendeur);
      setForm({ ...initVendeur, ...vendeur });
    } else {
      setVendeurEdite(null);
      setForm(initVendeur);
    }
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    setEnCours(true);
    if (vendeurEdite) {
      await base44.entities.Vendeur.update(vendeurEdite.id, {
        nom_complet: form.nom_complet,
        email: form.email,
        telephone: form.telephone,
        statut: form.statut,
        date_embauche: form.date_embauche,
      });
      await base44.entities.JournalAudit.create({
        action: "Vendeur modifié",
        module: "vendeur",
        details: `Vendeur ${form.nom_complet} modifié`,
        entite_id: vendeurEdite.id,
      });
    } else {
      await base44.entities.Vendeur.create(form);
      await base44.entities.JournalAudit.create({
        action: "Vendeur créé",
        module: "vendeur",
        details: `Nouveau vendeur: ${form.nom_complet}`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
    setDialogOuvert(false);
    setEnCours(false);
  };

  const supprimer = async (vendeur) => {
    if (!confirm(`Supprimer le vendeur "${vendeur.nom_complet}" ?`)) return;
    await base44.entities.Vendeur.delete(vendeur.id);
    await base44.entities.JournalAudit.create({
      action: "Vendeur supprimé",
      module: "vendeur",
      details: `Vendeur ${vendeur.nom_complet} supprimé`,
      entite_id: vendeur.id,
    });
    queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
  };

  const vendeursFiltres = vendeurs.filter((v) =>
    `${v.nom_complet} ${v.email} ${v.telephone}`.toLowerCase().includes(recherche.toLowerCase())
  );

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} DA`;

  if (isLoading) {
    return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher un vendeur..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => ouvrir(null)} className="bg-[#1a1f5e] hover:bg-[#141952]">
          <Plus className="w-4 h-4 mr-2" /> Nouveau Vendeur
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Vendeur</TableHead>
                <TableHead>Contact</TableHead>

                <TableHead className="text-right">CA Généré</TableHead>
                <TableHead className="text-right">Solde Commission</TableHead>
                <TableHead className="text-center">Ventes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendeursFiltres.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Aucun vendeur</TableCell></TableRow>
              )}
              {vendeursFiltres.map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {v.nom_complet?.[0]?.toUpperCase() || "V"}
                      </div>
                      <div>
                        <p className="font-medium">{v.nom_complet}</p>
                        <p className="text-xs text-slate-500">{v.date_embauche ? new Date(v.date_embauche).toLocaleDateString("fr-FR") : ""}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{v.email || "—"}</p>
                    <p className="text-slate-500">{v.telephone || "—"}</p>
                  </TableCell>
                  <TableCell className="text-center font-medium">{v.taux_commission}%</TableCell>
                  <TableCell className="text-right font-medium">{formater(v.chiffre_affaires_genere)}</TableCell>
                  <TableCell className="text-right font-bold text-yellow-600">{formater(v.solde_commission)}</TableCell>
                  <TableCell className="text-center">{v.nombre_ventes || 0}</TableCell>
                  <TableCell>
                    <Badge className={v.statut === "actif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                      {v.statut === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => ouvrir(v)}>
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => supprimer(v)}>
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
            <DialogTitle>{vendeurEdite ? "Modifier le Vendeur" : "Nouveau Vendeur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom Complet *</Label><Input value={form.nom_complet} onChange={(e) => modifier("nom_complet", e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => modifier("email", e.target.value)} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => modifier("telephone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Taux de Commission (%)</Label><Input type="number" min="0" max="100" value={form.taux_commission} onChange={(e) => modifier("taux_commission", parseFloat(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label>Date d'Embauche</Label><Input type="date" value={form.date_embauche} onChange={(e) => modifier("date_embauche", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom_complet} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : vendeurEdite ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}