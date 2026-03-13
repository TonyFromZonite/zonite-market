import React, { useState, useEffect } from "react";
import { requireAdminOrSousAdmin } from "@/components/useSessionGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { showSuccess, showError } from "@/components/NotificationSystem";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Package, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CategoriesTab from "@/components/produits/CategoriesTab";
import RetoursTab from "@/components/produits/RetoursTab";
import DialogProduit from "@/components/produits/DialogProduit";

const initProduit = {
  nom: "", description: "", reference: "",
  categorie_id: "", categorie_nom: "",
  prix_achat: "", prix_gros: "",
  fournisseur_nom: "", fournisseur_pays: "", delai_acquisition: "",
  stock_global: 0, seuil_alerte_global: 5,
  stocks_par_localisation: [],
  variations_definition: [],
  statut: "actif",
  image_url: "",
  images_urls: [],
  lien_telegram: "",
};

const ONGLETS_PRODUITS = [
  { key: "produits", label: "Produits" },
  { key: "categories", label: "Catégories" },
  { key: "retours", label: "Retours" },
];

export default function Produits() {
  useEffect(() => { requireAdminOrSousAdmin(); }, []);
  const [ongletActif, setOngletActif] = useState("produits");
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("all");
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
    staleTime: 30 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Categorie.list("nom"),
    staleTime: 60 * 60 * 1000,
  });

  const recalculerStockGlobal = (locs) => {
    return (locs || []).reduce((total, loc) => {
      const stockZone = (loc.variations_stock || []).reduce((s, v) => s + (parseInt(v.quantite) || 0), 0);
      return total + stockZone;
    }, 0);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  const ouvrir = (produit) => {
    if (produit) {
      setProduitEdite(produit);
      setForm({
        ...initProduit, ...produit,
        stocks_par_localisation: produit.stocks_par_localisation || [],
        images_urls: produit.images_urls || (produit.image_url ? [produit.image_url] : []),
        variations_definition: produit.variations_definition || [],
      });
    } else {
      setProduitEdite(null);
      setForm(initProduit);
    }
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    if (!form.nom?.trim()) { showError("Nom requis"); return; }
    if (!form.reference?.trim()) { showError("Référence requise"); return; }
    if (!form.prix_achat || form.prix_achat <= 0) { showError("Prix d'achat invalide"); return; }

    setEnCours(true);
    try {
      const stockGlobal = recalculerStockGlobal(form.stocks_par_localisation || []);
      const data = { ...form, stock_global: stockGlobal };

      if (produitEdite) {
        await adminApi.updateProduit(produitEdite.id, data);
        showSuccess("Produit modifié");
      } else {
        await adminApi.createProduit(data);
        showSuccess("Produit créé");
      }

      queryClient.invalidateQueries({ queryKey: ["produits"] });
      setForm(initProduit);
      setProduitEdite(null);
      setDialogOuvert(false);
    } catch (err) {
      showError("Erreur", err.message);
    } finally {
      setEnCours(false);
    }
  };

  const [confirmSuppressionProduit, setConfirmSuppressionProduit] = useState(null);

  const supprimer = async (produit) => {
    setEnCours(true);
    try {
      await adminApi.deleteProduit(produit.id);
      showSuccess("Produit supprimé définitivement");
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      setConfirmSuppressionProduit(null);
    } catch (err) {
      showError("Erreur", err.message);
    } finally {
      setEnCours(false);
    }
  };

  const ajouterStock = async () => {
    if (!produitEdite || stockAjout <= 0) return;
    setEnCours(true);
    try {
      const ancien = produitEdite.stock_global || 0;
      const nouveau = ancien + stockAjout;
      await adminApi.updateProduit(produitEdite.id, { stock_global: nouveau, statut: nouveau > 0 ? "actif" : produitEdite.statut });
      showSuccess(`+${stockAjout} unité(s)`);
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      setDialogStock(false);
      setStockAjout(0);
    } catch (err) {
      showError("Erreur", err.message);
    } finally {
      setEnCours(false);
    }
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────────
  const produitsFiltres = produits.filter((p) => {
    if (p.statut === "supprime") return false;
    const matchRecherche = `${p.nom} ${p.reference} ${p.fournisseur_nom}`.toLowerCase().includes(recherche.toLowerCase());
    const matchCategorie = filtreCategorie === "all" || p.categorie_id === filtreCategorie;
    return matchRecherche && matchCategorie;
  });

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const commissionVendeur = (p) => (p.prix_vente || 0) - (p.prix_gros || 0);
  const beneficeZonite = (p) => (p.prix_gros || 0) - (p.prix_achat || 0);

  const { data: retoursEnAttente = [] } = useQuery({
    queryKey: ["retours_badge"],
    queryFn: () => base44.entities.RetourProduit.filter({ statut: "en_attente" }),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Onglets de navigation */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {ONGLETS_PRODUITS.map(({ key, label }) => {
          const badge = key === "retours" ? retoursEnAttente.length : 0;
          return (
            <button
              key={key}
              onClick={() => setOngletActif(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${ongletActif === key ? "border-[#1a1f5e] text-[#1a1f5e]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {label}
              {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
            </button>
          );
        })}
      </div>

      {ongletActif === "categories" && <CategoriesTab />}
      {ongletActif === "retours" && <RetoursTab />}
      {ongletActif === "produits" && (
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
                <TableHead className="text-right">Bénéfice Zonite</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Variations</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produitsFiltres.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">Aucun produit</TableCell></TableRow>
              )}
              {produitsFiltres.map((p) => {
                const bz = beneficeZonite(p);
                const stockGlobal = p.stock_global || 0;
                const enAlerte = stockGlobal <= (p.seuil_alerte_global || 5);
                const nbVariations = (p.variations_definition || []).length;
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
                        <Button variant="ghost" size="icon" onClick={() => setConfirmSuppressionProduit(p)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogProduit
        open={dialogOuvert}
        onOpenChange={setDialogOuvert}
        produit={produitEdite}
        form={form}
        setForm={setForm}
        categories={categories}
        onSave={sauvegarder}
        enCours={enCours}
      />

      {/* Dialog confirmation suppression produit */}
      <Dialog open={!!confirmSuppressionProduit} onOpenChange={() => setConfirmSuppressionProduit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer le produit</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Êtes-vous sûr de vouloir supprimer <strong>"{confirmSuppressionProduit?.nom}"</strong> ? Cette action ne peut pas être annulée.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSuppressionProduit(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => supprimer(confirmSuppressionProduit)} disabled={enCours}>
              {enCours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Supprimer
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
              <Input type="number" min="1" value={stockAjout} 
                onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                onChange={(e) => setStockAjout(parseInt(e.target.value) || 0)} />
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
      )}
    </div>
  );
}