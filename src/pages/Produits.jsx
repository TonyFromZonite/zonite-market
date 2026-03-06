import React, { useState, useEffect } from "react";
import { requireAdminOrSousAdmin } from "@/components/useSessionGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCachedQuery, invalidateQuery } from "@/components/CacheManager";
import { showSuccess, showError } from "@/components/NotificationSystem";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Package, Loader2, MapPin, ImagePlus, X, Layers, Tag, RotateCcw, PackageCheck, XCircle } from "lucide-react";
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
  lien_telegram: "",
};

const initLocalisation = { ville: "", zone: "", quantite: 0, seuil_alerte: 5 };
const initVariation = { attributs: "", prix_vente_specifique: "", stock: 0, seuil_alerte: 5 };

const ONGLETS_PRODUITS = [
  { key: "produits", label: "Produits" },
  { key: "categories", label: "Catégories" },
  { key: "retours", label: "Retours" },
];

const RAISONS = {
  defaut_produit: "Défaut produit",
  mauvaise_livraison: "Mauvaise livraison",
  client_refuse: "Client a refusé",
  autre: "Autre",
};
const STATUTS_RETOUR = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  traite:     { label: "Traité ✓",   couleur: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejete:     { label: "Rejeté",     couleur: "bg-red-100 text-red-800 border-red-200" },
};
const ACTIONS_VENDEUR = {
  aucune: "Aucune action",
  deduire_commission: "Déduire du solde",
  crediter_bonus: "Créditer un bonus",
};
const fmt = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Sous-page Catégories ───────────────────────────────────────────────────
function CategoriesTab() {
   const [dialogOuvert, setDialogOuvert] = useState(false);
   const [edite, setEdite] = useState(null);
   const [form, setForm] = useState({ nom: "", description: "" });
   const [enCours, setEnCours] = useState(false);
   const [confirmSuppression, setConfirmSuppression] = useState(null);
   const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Categorie.list("nom"),
  });

  const ouvrir = (cat) => {
    if (cat) { setEdite(cat); setForm({ nom: cat.nom, description: cat.description || "" }); }
    else { setEdite(null); setForm({ nom: "", description: "" }); }
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    if (!form.nom.trim()) return;
    setEnCours(true);
    try {
      if (edite) {
        await base44.functions.invoke('updateCategorie', { categorieId: edite.id, data: form });
        showSuccess("Catégorie modifiée", "La catégorie a été mise à jour avec succès");
      } else {
        await base44.functions.invoke('createCategorie', form);
        showSuccess("Catégorie créée", "La nouvelle catégorie a été créée avec succès");
      }
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOuvert(false);
    } catch (err) {
      showError("Erreur de sauvegarde", err.message || "Échec de la sauvegarde");
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async (cat) => {
    try {
      await base44.functions.invoke('deleteCategorie', { categorieId: cat.id });
      showSuccess("Catégorie supprimée", "La catégorie a été supprimée avec succès");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setConfirmSuppression(null);
    } catch (err) {
      showError("Erreur de suppression", err.message || "Échec de la suppression");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{categories.length} catégorie(s)</p>
        <Button onClick={() => ouvrir(null)} className="bg-[#1a1f5e] hover:bg-[#141952]">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle Catégorie
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {isLoading && Array(6).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1a1f5e]/10 rounded-lg flex items-center justify-center">
                <Tag className="w-4 h-4 text-[#1a1f5e]" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{cat.nom}</p>
                {cat.description && <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>}
              </div>
            </div>
            <div className="flex gap-1 ml-2">
              <Button variant="ghost" size="icon" onClick={() => ouvrir(cat)}><Pencil className="w-4 h-4 text-slate-400" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setConfirmSuppression(cat)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
        {!isLoading && categories.length === 0 && <div className="col-span-3 text-center py-10 text-slate-400">Aucune catégorie.</div>}
      </div>
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{edite ? "Modifier la Catégorie" : "Nouvelle Catégorie"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom.trim()} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : edite ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmSuppression} onOpenChange={() => setConfirmSuppression(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer la catégorie</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Êtes-vous sûr de vouloir supprimer <strong>"{confirmSuppression?.nom}"</strong> ? Cette action ne peut pas être annulée.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSuppression(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => supprimer(confirmSuppression)} disabled={enCours}>
              {enCours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sous-page Retours ──────────────────────────────────────────────────────
function RetoursTab() {
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
    if (stockReintegre) {
      const [produit] = await base44.entities.Produit.filter({ id: retourSelectionne.produit_id });
      if (produit) {
        await base44.functions.invoke('updateProduit', { produitId: produit.id, data: { stock_global: (produit.stock_global || 0) + retourSelectionne.quantite_retournee } });
        await adminApi.createMouvementStock({ produit_id: produit.id, produit_nom: produit.nom, type_mouvement: "entree", quantite: retourSelectionne.quantite_retournee, stock_avant: produit.stock_global || 0, stock_apres: (produit.stock_global || 0) + retourSelectionne.quantite_retournee, raison: `Retour produit — ${RAISONS[retourSelectionne.raison]}` });
      }
    }
    if (actionVendeur !== "aucune" && montant > 0) {
      const [compte] = await base44.entities.CompteVendeur.filter({ id: retourSelectionne.vendeur_id });
      if (compte) {
        const delta = actionVendeur === "deduire_commission" ? -montant : montant;
        await base44.entities.CompteVendeur.update(compte.id, { solde_commission: Math.max(0, (compte.solde_commission || 0) + delta) });
      }
    }
    await adminApi.updateRetourProduit(retourSelectionne.id, { statut: "traite", stock_reintegre: stockReintegre, action_vendeur: actionVendeur, montant_ajustement: montant, notes_admin: notesAdmin });
    let msgAction = "";
    if (actionVendeur === "deduire_commission" && montant > 0) msgAction = ` Déduction de ${fmt(montant)} sur votre solde.`;
    if (actionVendeur === "crediter_bonus" && montant > 0) msgAction = ` Crédit de ${fmt(montant)} sur votre solde.`;
    await adminApi.createNotificationVendeur({ vendeur_email: retourSelectionne.vendeur_email, titre: "Retour produit traité", message: `Le retour de ${retourSelectionne.quantite_retournee}x ${retourSelectionne.produit_nom} a été traité.${msgAction}`, type: "info" });
    await adminApi.createJournalAudit({ action: "Retour produit traité", module: "commande", details: `Retour ${retourSelectionne.id} — ${retourSelectionne.produit_nom} × ${retourSelectionne.quantite_retournee}`, entite_id: retourSelectionne.id });
    queryClient.invalidateQueries({ queryKey: ["retours_admin"] });
    setEnCours(false);
    setRetourSelectionne(null);
  };

  const rejeterRetour = async () => {
    setEnCours(true);
    await adminApi.updateRetourProduit(retourSelectionne.id, { statut: "rejete", notes_admin: notesAdmin });
    await adminApi.createNotificationVendeur({ vendeur_email: retourSelectionne.vendeur_email, titre: "Retour produit rejeté", message: `Le retour de ${retourSelectionne.produit_nom} a été rejeté.${notesAdmin ? ` Raison : ${notesAdmin}` : ""}`, type: "alerte" });
    queryClient.invalidateQueries({ queryKey: ["retours_admin"] });
    setEnCours(false);
    setRetourSelectionne(null);
  };

  const retoursFiltres = retours.filter(r => {
    const texte = `${r.produit_nom} ${r.vendeur_nom}`.toLowerCase();
    return (filtreStatut === "tous" || r.statut === filtreStatut) && (!recherche || texte.includes(recherche.toLowerCase()));
  });

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
            {Object.entries(STATUTS_RETOUR).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {retoursFiltres.length === 0 ? (
          <div className="p-10 text-center text-slate-400"><RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Aucun retour enregistré</p></div>
        ) : retoursFiltres.map(r => (
          <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => ouvrirRetour(r)}>
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-medium text-sm text-slate-900 truncate">{r.produit_nom} <span className="text-slate-400 font-normal">× {r.quantite_retournee}</span></p>
              <p className="text-xs text-slate-500">{r.vendeur_nom} — {RAISONS[r.raison]}</p>
              <p className="text-xs text-slate-400">{formaterDate(r.created_date)}</p>
            </div>
            <Badge className={`${STATUTS_RETOUR[r.statut]?.couleur} border text-xs whitespace-nowrap`}>{STATUTS_RETOUR[r.statut]?.label}</Badge>
          </div>
        ))}
      </div>
      <Dialog open={!!retourSelectionne} onOpenChange={() => setRetourSelectionne(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-orange-500" /> Retour : {retourSelectionne?.produit_nom}</DialogTitle></DialogHeader>
          {retourSelectionne && (
            <div className="space-y-4 text-sm">
              <Badge className={`${STATUTS_RETOUR[retourSelectionne.statut]?.couleur} border`}>{STATUTS_RETOUR[retourSelectionne.statut]?.label}</Badge>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
                <div><p className="text-slate-400 text-xs">Vendeur</p><p className="font-medium">{retourSelectionne.vendeur_nom}</p></div>
                <div><p className="text-slate-400 text-xs">Quantité retournée</p><p className="font-bold text-orange-600">{retourSelectionne.quantite_retournee}</p></div>
                <div className="col-span-2"><p className="text-slate-400 text-xs">Raison</p><p className="font-medium">{RAISONS[retourSelectionne.raison]}</p></div>
                {retourSelectionne.raison_detail && <div className="col-span-2"><p className="text-slate-400 text-xs">Détail</p><p>{retourSelectionne.raison_detail}</p></div>}
              </div>
              {retourSelectionne.statut === "en_attente" && (
                <>
                  <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                    <p className="font-medium text-slate-700">Gestion du stock</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={stockReintegre} onChange={e => setStockReintegre(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                      <span className="text-slate-700">Réintégrer {retourSelectionne.quantite_retournee} unité(s) en stock</span>
                    </label>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 space-y-3">
                    <p className="font-medium text-slate-700">Action sur le solde du vendeur</p>
                    <Select value={actionVendeur} onValueChange={setActionVendeur}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ACTIONS_VENDEUR).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    {actionVendeur !== "aucune" && (
                      <div className="space-y-1">
                        <label className="text-slate-500 text-xs font-medium">Montant (FCFA)</label>
                        <Input type="number" value={montantAjustement} onChange={e => setMontantAjustement(e.target.value)} placeholder="0" min="0" />
                        {actionVendeur === "deduire_commission" && montantAjustement && <p className="text-xs text-red-600">⚠ {fmt(montantAjustement)} seront déduits du solde du vendeur</p>}
                        {actionVendeur === "crediter_bonus" && montantAjustement && <p className="text-xs text-emerald-600">✓ {fmt(montantAjustement)} seront crédités sur le solde du vendeur</p>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 text-xs font-medium">Note pour le vendeur</label>
                    <Textarea value={notesAdmin} onChange={e => setNotesAdmin(e.target.value)} placeholder="Explication du traitement..." rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={traiterRetour} disabled={enCours} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2">
                      {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />} Valider
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
                  {retourSelectionne.action_vendeur !== "aucune" && <p className="text-xs mt-1">{ACTIONS_VENDEUR[retourSelectionne.action_vendeur]} : {fmt(retourSelectionne.montant_ajustement)}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  const [locAjout, setLocAjout] = useState(initLocalisation);
  const [varAjout, setVarAjout] = useState(initVariation);
  const [urlImageAjout, setUrlImageAjout] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: produitsRaw, isLoading } = useCachedQuery(
    'PRODUITS',
    () => base44.entities.Produit.list("-created_date"),
    { ttl: 30 * 60 * 1000 }
  );
  const produits = produitsRaw || [];

  const { data: categoriesRaw } = useCachedQuery(
    'CATEGORIES',
    () => base44.entities.Categorie.list("nom"),
    { ttl: 60 * 60 * 1000 }
  );
  const categories = categoriesRaw || [];

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
    // Validation complète
    if (!form.nom?.trim()) { showError("Champ obligatoire", "Le nom du produit est requis"); return; }
    if (!form.reference?.trim()) { showError("Champ obligatoire", "La référence est requise"); return; }
    if (!form.prix_achat || form.prix_achat <= 0) { showError("Tarification invalide", "Le prix d'achat doit être > 0"); return; }

    setEnCours(true);
    try {
      const stockGlobal = recalculerStockGlobal(form.stocks_par_localisation || []);
      const data = { ...form, stock_global: stockGlobal };

      if (produitEdite) {
        await base44.functions.invoke('updateProduit', { produitId: produitEdite.id, data });
        await adminApi.createJournalAudit({ action: "Produit modifié", module: "produit", details: `Produit ${form.nom} modifié`, entite_id: produitEdite.id });
        showSuccess("Produit modifié", `${form.nom} a été mis à jour avec succès`);
      } else {
        const newProd = await base44.entities.Produit.create(data);
        await adminApi.createJournalAudit({ action: "Produit créé", module: "produit", details: `Nouveau produit: ${form.nom} (${form.reference})`, entite_id: newProd.id });
        showSuccess("Produit créé", `${form.nom} a été créé avec succès`);
      }

      invalidateQuery('PRODUITS');
      invalidateQuery('CATEGORIES');
      queryClient.invalidateQueries({ queryKey: ["produits"] });

      // Réinitialiser le formulaire ET fermer le dialog
      setForm(initProduit);
      setProduitEdite(null);
      setDialogOuvert(false);
    } catch (err) {
      showError("Erreur de sauvegarde", err.message || "Échec de la sauvegarde");
    } finally {
      setEnCours(false);
    }
  };

  const [confirmSuppressionProduit, setConfirmSuppressionProduit] = useState(null);

  const supprimer = async (produit) => {
    setEnCours(true);
    try {
      await base44.functions.invoke('updateProduit', { produitId: produit.id, data: { statut: "supprime" } });
      await adminApi.createJournalAudit({ action: "Produit supprimé", module: "produit", details: `Produit ${produit.nom} supprimé`, entite_id: produit.id });
      showSuccess("Produit supprimé", `${produit.nom} a été supprimé avec succès`);
      invalidateQuery('PRODUITS');
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      setConfirmSuppressionProduit(null);
    } catch (err) {
      showError("Erreur de suppression", err.message || "Échec de la suppression");
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
      await base44.functions.invoke('updateProduit', { produitId: produitEdite.id, data: { stock_global: nouveau, statut: nouveau > 0 ? "actif" : produitEdite.statut } });
      await adminApi.createMouvementStock({ produit_id: produitEdite.id, produit_nom: produitEdite.nom, type_mouvement: "entree", quantite: stockAjout, stock_avant: ancien, stock_apres: nouveau, raison: "Approvisionnement" });
      await adminApi.createJournalAudit({ action: "Stock ajouté", module: "produit", details: `+${stockAjout} unités pour ${produitEdite.nom} (${ancien} → ${nouveau})`, entite_id: produitEdite.id });
      showSuccess("Stock ajouté", `+${stockAjout} unité(s) pour ${produitEdite.nom}`);
      invalidateQuery('PRODUITS');
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      setDialogStock(false);
      setStockAjout(0);
    } catch (err) {
      console.error("Erreur lors de l'ajout de stock:", err);
      showError("Erreur d'approvisionnement", err.message || "Échec de l'approvisionnement");
    } finally {
      setEnCours(false);
    }
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

  const { data: retoursEnAttenteRaw } = useCachedQuery(
    'RETOURS',
    () => base44.entities.RetourProduit.filter({ statut: "en_attente" }),
    { ttl: 10 * 60 * 1000 }
  );
  const retoursEnAttente = retoursEnAttenteRaw || [];

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

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Marketing</p>
                <div className="space-y-2">
                  <Label>Lien Telegram (images et vidéos publicitaires)</Label>
                  <Input
                    value={form.lien_telegram}
                    onChange={(e) => modifier("lien_telegram", e.target.value)}
                    placeholder="https://t.me/votre_groupe_ou_canal_privé"
                  />
                  <p className="text-xs text-slate-400">Collez le lien du groupe/canal Telegram privé avec les visuels marketing de ce produit</p>
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
            <Button variant="outline" onClick={() => { setDialogOuvert(false); setForm(initProduit); setProduitEdite(null); }}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : produitEdite ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      )}
    </div>
  );
}