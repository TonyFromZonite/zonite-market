import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Package, Loader2, MapPin, ImagePlus, X, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const initProduit = {
  nom: "", description: "", reference: "",
  categorie_id: "", categorie_nom: "",
  prix_achat: "", prix_gros: "",
  fournisseur_nom: "", fournisseur_pays: "", delai_acquisition: "",
  stock_global: 0, seuil_alerte_global: 5,
  stocks_par_localisation: [],
  statut: "actif",
  image_url: "",
  images_urls: [],
  variations: [],
};

const initLocalisation = { ville: "", zone: "", quantite: 0, seuil_alerte: 5 };
const initVariation = { attributs: "", prix_vente_specifique: "", stock: 0, seuil_alerte: 5 };

export default function Produits() {
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("all");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [dialogStock, setDialogStock] = useState(false);
  const [produitEdite, setProduitEdite] = useState(null);
  const [form, setForm] = useState(initProduit);
  const [stockAjout, setStockAjout] = useState(0);
  const [locAjout, setLocAjout] = useState(initLocalisation);
  const [varAjout, setVarAjout] = useState(initVariation);
  const [urlImageAjout, setUrlImageAjout] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [uploadEnCours, setUploadEnCours] = useState(false);
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

  // ── Images ──────────────────────────────────────────────────────────────────
  const ajouterImageUrl = () => {
    if (!urlImageAjout.trim()) return;
    const imgs = [...(form.images_urls || []), urlImageAjout.trim()];
    setForm(p => ({ ...p, images_urls: imgs, image_url: imgs[0] }));
    setUrlImageAjout("");
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadEnCours(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const imgs = [...(form.images_urls || []), file_url];
    setForm(p => ({ ...p, images_urls: imgs, image_url: imgs[0] }));
    setUploadEnCours(false);
  };

  const supprimerImage = (idx) => {
    const imgs = (form.images_urls || []).filter((_, i) => i !== idx);
    setForm(p => ({ ...p, images_urls: imgs, image_url: imgs[0] || "" }));
  };

  // ── Variations ───────────────────────────────────────────────────────────────
  const ajouterVariation = () => {
    if (!varAjout.attributs.trim()) return;
    setForm(p => ({ ...p, variations: [...(p.variations || []), { ...varAjout }] }));
    setVarAjout(initVariation);
  };

  const supprimerVariation = (idx) => {
    setForm(p => ({ ...p, variations: (p.variations || []).filter((_, i) => i !== idx) }));
  };

  const modifierVariation = (idx, champ, valeur) => {
    setForm(p => {
      const vars = [...(p.variations || [])];
      vars[idx] = { ...vars[idx], [champ]: valeur };
      return { ...p, variations: vars };
    });
  };

  // ── Localisations ─────────────────────────────────────────────────────────────
  const ajouterLocalisation = () => {
    if (!locAjout.ville) return;
    setForm(p => ({ ...p, stocks_par_localisation: [...(p.stocks_par_localisation || []), { ...locAjout }] }));
    setLocAjout(initLocalisation);
  };

  const supprimerLocalisation = (idx) => {
    setForm(p => ({ ...p, stocks_par_localisation: p.stocks_par_localisation.filter((_, i) => i !== idx) }));
  };

  const recalculerStockGlobal = (locs) => locs.reduce((s, l) => s + (parseInt(l.quantite) || 0), 0);

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  const ouvrir = (produit) => {
    if (produit) {
      setProduitEdite(produit);
      setForm({
        ...initProduit, ...produit,
        stocks_par_localisation: produit.stocks_par_localisation || [],
        images_urls: produit.images_urls || (produit.image_url ? [produit.image_url] : []),
        variations: produit.variations || [],
      });
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
      await base44.entities.JournalAudit.create({ action: "Produit modifié", module: "produit", details: `Produit ${form.nom} modifié`, entite_id: produitEdite.id });
    } else {
      await base44.entities.Produit.create(data);
      await base44.entities.JournalAudit.create({ action: "Produit créé", module: "produit", details: `Nouveau produit: ${form.nom} (${form.reference})` });
    }
    queryClient.invalidateQueries({ queryKey: ["produits"] });
    setDialogOuvert(false);
    setEnCours(false);
  };

  const supprimer = async (produit) => {
    if (!confirm(`Supprimer le produit "${produit.nom}" ?`)) return;
    await base44.entities.Produit.delete(produit.id);
    await base44.entities.JournalAudit.create({ action: "Produit supprimé", module: "produit", details: `Produit ${produit.nom} supprimé`, entite_id: produit.id });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
  };

  const ajouterStock = async () => {
    if (!produitEdite || stockAjout <= 0) return;
    setEnCours(true);
    const ancien = produitEdite.stock_global || 0;
    const nouveau = ancien + stockAjout;
    await base44.entities.Produit.update(produitEdite.id, { stock_global: nouveau, statut: nouveau > 0 ? "actif" : produitEdite.statut });
    await base44.entities.MouvementStock.create({ produit_id: produitEdite.id, produit_nom: produitEdite.nom, type_mouvement: "entree", quantite: stockAjout, stock_avant: ancien, stock_apres: nouveau, raison: "Approvisionnement" });
    await base44.entities.JournalAudit.create({ action: "Stock ajouté", module: "produit", details: `+${stockAjout} unités pour ${produitEdite.nom} (${ancien} → ${nouveau})`, entite_id: produitEdite.id });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
    setDialogStock(false);
    setStockAjout(0);
    setEnCours(false);
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────────
  const produitsFiltres = produits.filter((p) => {
    const matchRecherche = `${p.nom} ${p.reference} ${p.fournisseur_nom}`.toLowerCase().includes(recherche.toLowerCase());
    const matchCategorie = filtreCategorie === "all" || p.categorie_id === filtreCategorie;
    return matchRecherche && matchCategorie;
  });

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const commissionVendeur = (p) => (p.prix_vente || 0) - (p.prix_gros || 0);
  const beneficeZonite = (p) => (p.prix_gros || 0) - (p.prix_achat || 0);

  if (isLoading) {
    return <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtres + bouton */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-1 gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Rechercher un produit..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="pl-9" />
          </div>
          <Select value={filtreCategorie} onValueChange={setFiltreCategorie}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => ouvrir(null)} className="bg-[#1a1f5e] hover:bg-[#141952]">
          <Plus className="w-4 h-4 mr-2" /> Nouveau Produit
        </Button>
      </div>

      {/* Tableau */}
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
                <TableHead className="text-right">Comm. Vendeur</TableHead>
                <TableHead className="text-right">Bénéfice Zonite</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Variations</TableHead>
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
                const nbVariations = (p.variations || []).length;
                return (
                  <TableRow key={p.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(p.images_urls?.[0] || p.image_url) ? (
                          <img src={p.images_urls?.[0] || p.image_url} alt={p.nom} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium">{p.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{p.reference}</TableCell>
                    <TableCell className="text-sm">{p.categorie_nom || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{formater(p.prix_achat)}</TableCell>
                    <TableCell className="text-right text-sm">{formater(p.prix_gros)}</TableCell>
                    <TableCell className="text-right text-sm text-yellow-600 font-medium">{formater(cv)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600 font-medium">{formater(bz)}</TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => { setProduitEdite(p); setDialogStock(true); }}
                        className={`px-2 py-1 rounded text-sm font-medium cursor-pointer ${enAlerte ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {stockGlobal}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      {nbVariations > 0 ? (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">{nbVariations} var.</Badge>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${p.statut === "actif" ? "bg-emerald-100 text-emerald-700" : p.statut === "rupture" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                        {p.statut === "actif" ? "Actif" : p.statut === "rupture" ? "Rupture" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => ouvrir(p)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => supprimer(p)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Dialog Produit ── */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{produitEdite ? "Modifier le Produit" : "Nouveau Produit"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="infos" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="infos">Infos</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="variations">Variations</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
            </TabsList>

            {/* ─ Onglet Infos ─ */}
            <TabsContent value="infos" className="space-y-5">
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
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={form.statut} onValueChange={(v) => modifier("statut", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="rupture">Rupture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Tarification</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prix d'Achat (FCFA) *</Label>
                    <Input type="number" min="0" value={form.prix_achat} onFocus={(e) => e.target.select()}
                      onChange={(e) => modifier("prix_achat", e.target.value === "" ? "" : parseFloat(e.target.value))}
                      onBlur={(e) => modifier("prix_achat", parseFloat(e.target.value) || 0)} />
                    <p className="text-xs text-slate-400">Coût fournisseur</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prix de Gros (FCFA)</Label>
                    <Input type="number" min="0" value={form.prix_gros} onFocus={(e) => e.target.select()}
                      onChange={(e) => modifier("prix_gros", e.target.value === "" ? "" : parseFloat(e.target.value))}
                      onBlur={(e) => modifier("prix_gros", parseFloat(e.target.value) || 0)} />
                    <p className="text-xs text-slate-400">Prix cédé au vendeur</p>
                  </div>
                </div>
                {(parseFloat(form.prix_gros) > 0 && parseFloat(form.prix_achat) > 0) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mt-3">
                    <p className="text-slate-500">Bénéfice ZONITE par unité</p>
                    <p className="font-bold text-emerald-700">{formater((parseFloat(form.prix_gros) || 0) - (parseFloat(form.prix_achat) || 0))}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Fournisseur</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Nom du Fournisseur</Label><Input value={form.fournisseur_nom} onChange={(e) => modifier("fournisseur_nom", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Pays</Label><Input value={form.fournisseur_pays} onChange={(e) => modifier("fournisseur_pays", e.target.value)} placeholder="ex: Chine" /></div>
                  <div className="space-y-2"><Label>Délai d'Acquisition</Label><Input value={form.delai_acquisition} onChange={(e) => modifier("delai_acquisition", e.target.value)} placeholder="ex: 15 jours" /></div>
                </div>
              </div>
            </TabsContent>

            {/* ─ Onglet Images ─ */}
            <TabsContent value="images" className="space-y-4">
              <p className="text-sm text-slate-500">Ajoutez plusieurs images pour ce produit. La première image sera utilisée comme image principale.</p>

              {/* Grille d'images existantes */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {(form.images_urls || []).map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
                    <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-[#1a1f5e] text-white rounded px-1">Principale</span>
                    )}
                    <button
                      onClick={() => supprimerImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Bouton d'upload */}
                <label className="border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#1a1f5e] hover:bg-slate-50 transition-colors">
                  {uploadEnCours ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-400">Uploader</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploadEnCours} />
                </label>
              </div>

              {/* Ajouter par URL */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Ou ajouter via URL</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://exemple.com/image.jpg"
                    value={urlImageAjout}
                    onChange={(e) => setUrlImageAjout(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && ajouterImageUrl()}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={ajouterImageUrl}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ─ Onglet Variations ─ */}
            <TabsContent value="variations" className="space-y-4">
              <p className="text-sm text-slate-500">Définissez les variations du produit (couleur, taille, modèle, etc.) avec leur stock dédié.</p>

              {/* Variations existantes */}
              {(form.variations || []).length > 0 && (
                <div className="space-y-2">
                  {form.variations.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 bg-slate-50 rounded-lg p-3 items-center">
                      <Input
                        className="col-span-2"
                        placeholder="ex: Rouge / M"
                        value={v.attributs}
                        onChange={(e) => modifierVariation(idx, "attributs", e.target.value)}
                      />
                      <Input
                        type="number" min="0"
                        placeholder="Prix spécif."
                        value={v.prix_vente_specifique}
                        onChange={(e) => modifierVariation(idx, "prix_vente_specifique", parseFloat(e.target.value) || "")}
                      />
                      <Input
                        type="number" min="0"
                        placeholder="Stock"
                        value={v.stock}
                        onChange={(e) => modifierVariation(idx, "stock", parseInt(e.target.value) || 0)}
                      />
                      <div className="flex gap-1 items-center">
                        <Input
                          type="number" min="0"
                          placeholder="Alerte"
                          value={v.seuil_alerte}
                          onChange={(e) => modifierVariation(idx, "seuil_alerte", parseInt(e.target.value) || 0)}
                        />
                        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => supprimerVariation(idx)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-5 gap-2 px-3 text-xs text-slate-400">
                    <span className="col-span-2">Attributs</span>
                    <span>Prix spéc. (FCFA)</span>
                    <span>Stock</span>
                    <span>Alerte</span>
                  </div>
                </div>
              )}

              {/* Ajouter variation */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Ajouter une variation</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                  <Input
                    className="md:col-span-2"
                    placeholder="ex: Rouge / M *"
                    value={varAjout.attributs}
                    onChange={(e) => setVarAjout(v => ({ ...v, attributs: e.target.value }))}
                  />
                  <Input
                    type="number" min="0"
                    placeholder="Prix spécif."
                    value={varAjout.prix_vente_specifique}
                    onChange={(e) => setVarAjout(v => ({ ...v, prix_vente_specifique: parseFloat(e.target.value) || "" }))}
                  />
                  <Input
                    type="number" min="0"
                    placeholder="Stock"
                    value={varAjout.stock}
                    onChange={(e) => setVarAjout(v => ({ ...v, stock: parseInt(e.target.value) || 0 }))}
                  />
                  <Input
                    type="number" min="0"
                    placeholder="Seuil"
                    value={varAjout.seuil_alerte}
                    onChange={(e) => setVarAjout(v => ({ ...v, seuil_alerte: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={ajouterVariation}>
                  <Layers className="w-3 h-3 mr-1" /> Ajouter cette variation
                </Button>
              </div>

              {(form.variations || []).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-700 font-medium">Stock total des variations : <span className="font-bold">{(form.variations || []).reduce((s, v) => s + (parseInt(v.stock) || 0), 0)} unités</span></p>
                </div>
              )}
            </TabsContent>

            {/* ─ Onglet Stock ─ */}
            <TabsContent value="stock" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seuil d'Alerte Global</Label>
                  <Input type="number" min="0" value={form.seuil_alerte_global} onChange={(e) => modifier("seuil_alerte_global", parseInt(e.target.value) || 0)} />
                </div>
              </div>

              {/* Localisations existantes */}
              {(form.stocks_par_localisation || []).length > 0 && (
                <div className="space-y-2">
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
                    Stock global calculé : {recalculerStockGlobal(form.stocks_par_localisation)} unités
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
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom || !form.reference} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : produitEdite ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog stock rapide */}
      <Dialog open={dialogStock} onOpenChange={setDialogStock}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approvisionner : {produitEdite?.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Stock global actuel : <span className="font-bold text-slate-900">{produitEdite?.stock_global || 0}</span></p>
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