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
import { Plus, Search, Pencil, Trash2, Package, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { valeur: "electronique", label: "Électronique" },
  { valeur: "mode", label: "Mode" },
  { valeur: "maison", label: "Maison" },
  { valeur: "beaute", label: "Beauté" },
  { valeur: "sport", label: "Sport" },
  { valeur: "alimentation", label: "Alimentation" },
  { valeur: "autre", label: "Autre" },
];

const initProduit = {
  nom: "", description: "", reference: "", prix_achat: 0,
  prix_gros: 0, prix_vente: 0, stock_actuel: 0, seuil_alerte: 5,
  categorie: "autre", statut: "actif", fournisseur: "", image_url: "",
};

export default function Produits() {
  const [recherche, setRecherche] = useState("");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [dialogStock, setDialogStock] = useState(false);
  const [produitEdite, setProduitEdite] = useState(null);
  const [form, setForm] = useState(initProduit);
  const [stockAjout, setStockAjout] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: produits = [], isLoading } = useQuery({
    queryKey: ["produits"],
    queryFn: () => base44.entities.Produit.list("-created_date"),
  });

  const modifier = (champ, valeur) => setForm((p) => ({ ...p, [champ]: valeur }));

  const ouvrir = (produit) => {
    if (produit) {
      setProduitEdite(produit);
      setForm({ ...initProduit, ...produit });
    } else {
      setProduitEdite(null);
      setForm(initProduit);
    }
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    setEnCours(true);
    if (produitEdite) {
      await base44.entities.Produit.update(produitEdite.id, form);
      await base44.entities.JournalAudit.create({
        action: "Produit modifié",
        module: "produit",
        details: `Produit ${form.nom} modifié`,
        entite_id: produitEdite.id,
      });
    } else {
      await base44.entities.Produit.create(form);
      await base44.entities.JournalAudit.create({
        action: "Produit créé",
        module: "produit",
        details: `Nouveau produit: ${form.nom} (${form.reference})`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["produits"] });
    setDialogOuvert(false);
    setEnCours(false);
  };

  const supprimer = async (produit) => {
    if (!confirm(`Supprimer le produit "${produit.nom}" ?`)) return;
    await base44.entities.Produit.delete(produit.id);
    await base44.entities.JournalAudit.create({
      action: "Produit supprimé",
      module: "produit",
      details: `Produit ${produit.nom} supprimé`,
      entite_id: produit.id,
    });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
  };

  const ajouterStock = async () => {
    if (!produitEdite || stockAjout <= 0) return;
    setEnCours(true);
    const ancien = produitEdite.stock_actuel || 0;
    const nouveau = ancien + stockAjout;
    await base44.entities.Produit.update(produitEdite.id, {
      stock_actuel: nouveau,
      statut: nouveau > 0 ? "actif" : produitEdite.statut,
    });
    await base44.entities.MouvementStock.create({
      produit_id: produitEdite.id,
      produit_nom: produitEdite.nom,
      type_mouvement: "entree",
      quantite: stockAjout,
      stock_avant: ancien,
      stock_apres: nouveau,
      raison: "Approvisionnement",
    });
    await base44.entities.JournalAudit.create({
      action: "Stock ajouté",
      module: "produit",
      details: `+${stockAjout} unités pour ${produitEdite.nom} (${ancien} → ${nouveau})`,
      entite_id: produitEdite.id,
    });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
    setDialogStock(false);
    setStockAjout(0);
    setEnCours(false);
  };

  const produitsFiltres = produits.filter((p) =>
    `${p.nom} ${p.reference} ${p.fournisseur}`.toLowerCase().includes(recherche.toLowerCase())
  );

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} DA`;

  if (isLoading) {
    return <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher un produit..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => ouvrir(null)} className="bg-[#1a1f5e] hover:bg-[#141952]">
          <Plus className="w-4 h-4 mr-2" /> Nouveau Produit
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Produit</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix Achat</TableHead>
                <TableHead className="text-right">Prix de Gros</TableHead>
                <TableHead className="text-right">Prix de Vente</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produitsFiltres.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Aucun produit</TableCell></TableRow>
              )}
              {produitsFiltres.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{p.nom}</TableCell>
                  <TableCell className="text-sm text-slate-500">{p.reference}</TableCell>
                  <TableCell className="capitalize text-sm">{CATEGORIES.find(c => c.valeur === p.categorie)?.label || p.categorie}</TableCell>
                  <TableCell className="text-right text-sm">{formater(p.prix_achat)}</TableCell>
                  <TableCell className="text-right text-sm">{formater(p.prix_gros)}</TableCell>
                  <TableCell className="text-right text-sm">{formater(p.prix_vente)}</TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => { setProduitEdite(p); setDialogStock(true); }}
                      className={`px-2 py-1 rounded text-sm font-medium cursor-pointer ${
                        (p.stock_actuel || 0) <= (p.seuil_alerte || 5)
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.stock_actuel || 0}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${
                      p.statut === "actif" ? "bg-emerald-100 text-emerald-700" :
                      p.statut === "rupture" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {p.statut === "actif" ? "Actif" : p.statut === "rupture" ? "Rupture" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => ouvrir(p)}>
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => supprimer(p)}>
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

      {/* Dialogue produit */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{produitEdite ? "Modifier le Produit" : "Nouveau Produit"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => modifier("nom", e.target.value)} /></div>
            <div className="space-y-2"><Label>Référence *</Label><Input value={form.reference} onChange={(e) => modifier("reference", e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.categorie} onValueChange={(v) => modifier("categorie", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.valeur} value={c.valeur}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Prix d'Achat (DA) *</Label><Input type="number" min="0" value={form.prix_achat} onChange={(e) => modifier("prix_achat", parseFloat(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label>Prix de Gros (DA)</Label><Input type="number" min="0" value={form.prix_gros} onChange={(e) => modifier("prix_gros", parseFloat(e.target.value) || 0)} /></div>
            <div className="col-span-2 space-y-2">
              <Label>Prix de Vente (DA) <span className="text-slate-400 font-normal text-xs">— prix vendeur → client</span></Label>
              <Input type="number" min="0" value={form.prix_vente} onChange={(e) => modifier("prix_vente", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2"><Label>Stock Actuel</Label><Input type="number" min="0" value={form.stock_actuel} onChange={(e) => modifier("stock_actuel", parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label>Seuil d'Alerte</Label><Input type="number" min="0" value={form.seuil_alerte} onChange={(e) => modifier("seuil_alerte", parseInt(e.target.value) || 0)} /></div>
            <div className="col-span-2 space-y-2"><Label>Fournisseur</Label><Input value={form.fournisseur} onChange={(e) => modifier("fournisseur", e.target.value)} /></div>
            <div className="col-span-2 space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => modifier("description", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom || !form.reference} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : produitEdite ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue stock */}
      <Dialog open={dialogStock} onOpenChange={setDialogStock}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approvisionner: {produitEdite?.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Stock actuel: <span className="font-bold text-slate-900">{produitEdite?.stock_actuel || 0}</span></p>
            <div className="space-y-2">
              <Label>Quantité à ajouter</Label>
              <Input type="number" min="1" value={stockAjout} onChange={(e) => setStockAjout(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogStock(false)}>Annuler</Button>
            <Button onClick={ajouterStock} disabled={enCours || stockAjout <= 0} className="bg-emerald-600 hover:bg-emerald-700">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Package className="w-4 h-4 mr-2" /> Approvisionner</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}