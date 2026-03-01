import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Package, Loader2, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const initProduit = {
  nom: "", description: "", reference: "",
  categorie_id: "", categorie_nom: "",
  prix_achat: "", prix_gros: "",
  fournisseur_nom: "", fournisseur_pays: "", delai_acquisition: "",
  stock_global: 0, seuil_alerte_global: 5,
  stocks_par_localisation: [],
  statut: "actif", image_url: "",
};

const initLocalisation = { ville: "", zone: "", quantite: 0, seuil_alerte: 5 };

export default function Produits() {
  const [recherche, setRecherche] = useState("");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [dialogStock, setDialogStock] = useState(false);
  const [produitEdite, setProduitEdite] = useState(null);
  const [form, setForm] = useState(initProduit);
  const [stockAjout, setStockAjout] = useState(0);
  const [locAjout, setLocAjout] = useState(initLocalisation);
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: produits = [], isLoading } = useQuery({
    queryKey: ["produits"],
    queryFn: () => base44.entities.Produit.list("-created_date"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Categorie.list("nom"),
  });

  const modifier = (champ, valeur) => setForm((p) => ({ ...p, [champ]: valeur }));

  const modifierCategorie = (id) => {
    const cat = categories.find(c => c.id === id);
    setForm(p => ({ ...p, categorie_id: id, categorie_nom: cat?.nom || "" }));
  };

  const ajouterLocalisation = () => {
    if (!locAjout.ville) return;
    setForm(p => ({
      ...p,
      stocks_par_localisation: [...(p.stocks_par_localisation || []), { ...locAjout }],
    }));
    setLocAjout(initLocalisation);
  };

  const supprimerLocalisation = (idx) => {
    setForm(p => ({
      ...p,
      stocks_par_localisation: p.stocks_par_localisation.filter((_, i) => i !== idx),
    }));
  };

  const recalculerStockGlobal = (locs) =>
    locs.reduce((sum, l) => sum + (parseInt(l.quantite) || 0), 0);

  const ouvrir = (produit) => {
    if (produit) {
      setProduitEdite(produit);
      setForm({ ...initProduit, ...produit, stocks_par_localisation: produit.stocks_par_localisation || [] });
    } else {
      setProduitEdite(null);
      setForm(initProduit);
    }
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    setEnCours(true);
    const stockGlobal = recalculerStockGlobal(form.stocks_par_localisation || []);
    const data = { ...form, stock_global: stockGlobal };
    if (produitEdite) {
      await base44.entities.Produit.update(produitEdite.id, data);
      await base44.entities.JournalAudit.create({
        action: "Produit modifié", module: "produit",
        details: `Produit ${form.nom} modifié`, entite_id: produitEdite.id,
      });
    } else {
      await base44.entities.Produit.create(data);
      await base44.entities.JournalAudit.create({
        action: "Produit créé", module: "produit",
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
      action: "Produit supprimé", module: "produit",
      details: `Produit ${produit.nom} supprimé`, entite_id: produit.id,
    });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
  };

  const ajouterStock = async () => {
    if (!produitEdite || stockAjout <= 0) return;
    setEnCours(true);
    const ancien = produitEdite.stock_global || 0;
    const nouveau = ancien + stockAjout;
    await base44.entities.Produit.update(produitEdite.id, {
      stock_global: nouveau,
      statut: nouveau > 0 ? "actif" : produitEdite.statut,
    });
    await base44.entities.MouvementStock.create({
      produit_id: produitEdite.id, produit_nom: produitEdite.nom,
      type_mouvement: "entree", quantite: stockAjout,
      stock_avant: ancien, stock_apres: nouveau, raison: "Approvisionnement",
    });
    await base44.entities.JournalAudit.create({
      action: "Stock ajouté", module: "produit",
      details: `+${stockAjout} unités pour ${produitEdite.nom} (${ancien} → ${nouveau})`,
      entite_id: produitEdite.id,
    });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
    setDialogStock(false);
    setStockAjout(0);
    setEnCours(false);
  };

  const produitsFiltres = produits.filter((p) =>
    `${p.nom} ${p.reference} ${p.fournisseur_nom}`.toLowerCase().includes(recherche.toLowerCase())
  );

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} DA`;

  // Calculs commissions
  const commissionVendeur = (p) => (p.prix_vente || 0) - (p.prix_gros || 0);
  const beneficeZonite = (p) => (p.prix_gros || 0) - (p.prix_achat || 0);

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
                <TableHead className="text-right">Comm. Vendeur</TableHead>
                <TableHead className="text-right">Bénéfice Zonite</TableHead>
                <TableHead className="text-center">Stock Global</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produitsFiltres.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-slate-400">Aucun produit</TableCell></TableRow>
              )}
              {produitsFiltres.map((p) => {
                const cv = commissionVendeur(p);
                const bz = beneficeZonite(p);
                const stockGlobal = p.stock_global || 0;
                const enAlerte = stockGlobal <= (p.seuil_alerte_global || 5);
                return (
                  <TableRow key={p.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell className="text-sm text-slate-500">{p.reference}</TableCell>
                    <TableCell className="text-sm">{p.categorie_nom || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{formater(p.prix_achat)}</TableCell>
                    <TableCell className="text-right text-sm">{formater(p.prix_gros)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formater(p.prix_vente)}</TableCell>
                    <TableCell className="text-right text-sm text-yellow-600 font-medium">{formater(cv)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600 font-medium">{formater(bz)}</TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => { setProduitEdite(p); setDialogStock(true); }}
                        className={`px-2 py-1 rounded text-sm font-medium cursor-pointer ${
                          enAlerte ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {stockGlobal}
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogue produit */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{produitEdite ? "Modifier le Produit" : "Nouveau Produit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">

            {/* Infos de base */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => modifier("nom", e.target.value)} /></div>
              <div className="space-y-2"><Label>Référence *</Label><Input value={form.reference} onChange={(e) => modifier("reference", e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.categorie_id} onValueChange={modifierCategorie}>
                  <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => modifier("description", e.target.value)} /></div>
            </div>

            {/* Prix */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Tarification</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prix d'Achat (DA) *</Label>
                  <Input type="number" min="0" value={form.prix_achat} onChange={(e) => modifier("prix_achat", parseFloat(e.target.value) || 0)} />
                  <p className="text-xs text-slate-400">Coût fournisseur</p>
                </div>
                <div className="space-y-2">
                  <Label>Prix de Gros (DA)</Label>
                  <Input type="number" min="0" value={form.prix_gros} onChange={(e) => modifier("prix_gros", parseFloat(e.target.value) || 0)} />
                  <p className="text-xs text-slate-400">Cédé au vendeur</p>
                </div>
                <div className="space-y-2">
                  <Label>Prix de Vente (DA)</Label>
                  <Input type="number" min="0" value={form.prix_vente} onChange={(e) => modifier("prix_vente", parseFloat(e.target.value) || 0)} />
                  <p className="text-xs text-slate-400">Vendeur → Client</p>
                </div>
              </div>
              {(form.prix_gros > 0 || form.prix_vente > 0) && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                    <p className="text-slate-500">Commission Vendeur</p>
                    <p className="font-bold text-yellow-700">{formater((form.prix_vente || 0) - (form.prix_gros || 0))}</p>
                    <p className="text-xs text-slate-400">Prix vente − Prix gros</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                    <p className="text-slate-500">Bénéfice ZONITE</p>
                    <p className="font-bold text-emerald-700">{formater((form.prix_gros || 0) - (form.prix_achat || 0))}</p>
                    <p className="text-xs text-slate-400">Prix gros − Prix achat</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fournisseur */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Fournisseur</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Nom du Fournisseur</Label><Input value={form.fournisseur_nom} onChange={(e) => modifier("fournisseur_nom", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pays</Label><Input value={form.fournisseur_pays} onChange={(e) => modifier("fournisseur_pays", e.target.value)} placeholder="ex: Chine" /></div>
                <div className="space-y-2"><Label>Délai d'Acquisition</Label><Input value={form.delai_acquisition} onChange={(e) => modifier("delai_acquisition", e.target.value)} placeholder="ex: 15 jours" /></div>
              </div>
            </div>

            {/* Stock */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Stock & Localisation</p>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-2"><Label>Seuil d'Alerte Global</Label><Input type="number" min="0" value={form.seuil_alerte_global} onChange={(e) => modifier("seuil_alerte_global", parseInt(e.target.value) || 0)} /></div>
              </div>

              {/* Localisations existantes */}
              {(form.stocks_par_localisation || []).length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.stocks_par_localisation.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">{loc.ville}</span>
                      {loc.zone && <span className="text-slate-500">/ {loc.zone}</span>}
                      <span className="ml-auto font-bold text-slate-700">{loc.quantite} unités</span>
                      <span className="text-xs text-slate-400">alerte: {loc.seuil_alerte}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => supprimerLocalisation(idx)}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 font-medium">
                    Stock global calculé: {recalculerStockGlobal(form.stocks_par_localisation)} unités
                  </p>
                </div>
              )}

              {/* Ajouter localisation */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Ajouter une localisation</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input placeholder="Ville *" value={locAjout.ville} onChange={(e) => setLocAjout(l => ({ ...l, ville: e.target.value }))} />
                  <Input placeholder="Zone" value={locAjout.zone} onChange={(e) => setLocAjout(l => ({ ...l, zone: e.target.value }))} />
                  <Input type="number" min="0" placeholder="Qté" value={locAjout.quantite} onChange={(e) => setLocAjout(l => ({ ...l, quantite: parseInt(e.target.value) || 0 }))} />
                  <Input type="number" min="0" placeholder="Seuil" value={locAjout.seuil_alerte} onChange={(e) => setLocAjout(l => ({ ...l, seuil_alerte: parseInt(e.target.value) || 0 }))} />
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={ajouterLocalisation}>
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom || !form.reference} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : produitEdite ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue stock rapide */}
      <Dialog open={dialogStock} onOpenChange={setDialogStock}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approvisionner: {produitEdite?.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Stock global actuel: <span className="font-bold text-slate-900">{produitEdite?.stock_global || 0}</span></p>
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