import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ImagePlus, X, Plus, Layers, MapPin, Trash2 } from "lucide-react";

const initLocalisation = { ville: "", zone: "", quantite: 0, seuil_alerte: 5 };
const initVariation = { attributs: "", prix_vente_specifique: "", stock: 0, seuil_alerte: 5 };

export default function DialogProduit({ open, onOpenChange, produit, form, setForm, categories, onSave, enCours }) {
  const [locAjout, setLocAjout] = useState(initLocalisation);
  const [varAjout, setVarAjout] = useState(initVariation);
  const [urlImageAjout, setUrlImageAjout] = useState("");
  const [uploadEnCours, setUploadEnCours] = useState(false);

  const modifier = (champ, valeur) => setForm(p => ({ ...p, [champ]: valeur }));

  const modifierCategorie = (id) => {
    const cat = categories.find(c => c.id === id);
    setForm(p => ({ ...p, categorie_id: id, categorie_nom: cat?.nom || "" }));
  };

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

  const ajouterLocalisation = () => {
    if (!locAjout.ville) return;
    setForm(p => ({ ...p, stocks_par_localisation: [...(p.stocks_par_localisation || []), { ...locAjout }] }));
    setLocAjout(initLocalisation);
  };

  const supprimerLocalisation = (idx) => {
    setForm(p => ({ ...p, stocks_par_localisation: p.stocks_par_localisation.filter((_, i) => i !== idx) }));
  };

  const recalculerStockGlobal = (locs, vars) => {
    const stockLoc = (locs || []).reduce((s, l) => s + (parseInt(l.quantite) || 0), 0);
    const stockVar = (vars || []).reduce((s, v) => s + (parseInt(v.stock) || 0), 0);
    return stockLoc + stockVar;
  };

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produit ? "Modifier le Produit" : "Nouveau Produit"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="infos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="infos">Infos</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="variations">Variations</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="infos" className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => modifier("nom", e.target.value)} /></div>
              <div className="space-y-2"><Label>Référence *</Label><Input value={form.reference} onChange={(e) => modifier("reference", e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.categorie_id} onValueChange={modifierCategorie}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
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
                  <Input type="number" min="0" value={form.prix_achat} 
                    onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; e.target.select(); }}
                    onChange={(e) => modifier("prix_achat", e.target.value === "" ? "" : parseFloat(e.target.value))}
                    onBlur={(e) => modifier("prix_achat", parseFloat(e.target.value) || 0)} />
                  <p className="text-xs text-slate-400">Coût fournisseur</p>
                </div>
                <div className="space-y-2">
                  <Label>Prix de Gros (FCFA)</Label>
                  <Input type="number" min="0" value={form.prix_gros} 
                    onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; e.target.select(); }}
                    onChange={(e) => modifier("prix_gros", e.target.value === "" ? "" : parseFloat(e.target.value))}
                    onBlur={(e) => modifier("prix_gros", parseFloat(e.target.value) || 0)} />
                  <p className="text-xs text-slate-400">Prix cédé au vendeur</p>
                </div>
              </div>
              {(parseFloat(form.prix_gros) > 0 && parseFloat(form.prix_achat) > 0) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mt-3">
                  <p className="text-slate-500">Bénéfice ZONITE</p>
                  <p className="font-bold text-emerald-700">{formater((parseFloat(form.prix_gros) || 0) - (parseFloat(form.prix_achat) || 0))}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Fournisseur</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Nom</Label><Input value={form.fournisseur_nom} onChange={(e) => modifier("fournisseur_nom", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pays</Label><Input value={form.fournisseur_pays} onChange={(e) => modifier("fournisseur_pays", e.target.value)} placeholder="ex: Chine" /></div>
                <div className="space-y-2"><Label>Délai</Label><Input value={form.delai_acquisition} onChange={(e) => modifier("delai_acquisition", e.target.value)} placeholder="15 jours" /></div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Marketing</p>
              <div className="space-y-2">
                <Label>Lien Telegram</Label>
                <Input value={form.lien_telegram} onChange={(e) => modifier("lien_telegram", e.target.value)} placeholder="https://t.me/..." />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(form.images_urls || []).map((url, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
                  <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && <span className="absolute top-1 left-1 text-[10px] bg-[#1a1f5e] text-white rounded px-1">Principale</span>}
                  <button onClick={() => supprimerImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#1a1f5e] hover:bg-slate-50">
                {uploadEnCours ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : <><ImagePlus className="w-6 h-6 text-slate-400 mb-1" /><span className="text-xs text-slate-400">Upload</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploadEnCours} />
              </label>
            </div>
            <div className="border border-dashed border-slate-300 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Ou via URL</p>
              <div className="flex gap-2">
                <Input placeholder="https://..." value={urlImageAjout} onChange={(e) => setUrlImageAjout(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ajouterImageUrl()} />
                <Button type="button" variant="outline" size="sm" onClick={ajouterImageUrl}><Plus className="w-3 h-3" /></Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variations" className="space-y-4">
            <p className="text-sm text-slate-500">Les variations permettent de gérer différentes versions du même produit (couleur, taille, etc.) avec leur propre stock.</p>
            
            {(form.variations || []).length > 0 && (
              <div className="space-y-2">
                {form.variations.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 bg-slate-50 rounded-lg p-3 items-center border border-slate-200">
                    <Input className="col-span-2" placeholder="Rouge / M" value={v.attributs} onChange={(e) => modifierVariation(idx, "attributs", e.target.value)} />
                    <Input type="number" min="0" placeholder="Prix" value={v.prix_vente_specifique} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => modifierVariation(idx, "prix_vente_specifique", parseFloat(e.target.value) || "")} />
                    <Input type="number" min="0" placeholder="Stock" value={v.stock} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => modifierVariation(idx, "stock", parseInt(e.target.value) || 0)} />
                    <div className="flex gap-1 items-center">
                      <Input type="number" min="0" placeholder="Alerte" value={v.seuil_alerte} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => modifierVariation(idx, "seuil_alerte", parseInt(e.target.value) || 0)} />
                      <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => supprimerVariation(idx)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </div>
                ))}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <p className="text-purple-700 font-medium">Stock total des variations : <span className="font-bold text-lg">{(form.variations || []).reduce((s, v) => s + (parseInt(v.stock) || 0), 0)} unités</span></p>
                </div>
              </div>
            )}
            <div className="border border-dashed border-slate-300 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Ajouter</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                <Input className="md:col-span-2" placeholder="Rouge / M *" value={varAjout.attributs} onChange={(e) => setVarAjout(v => ({ ...v, attributs: e.target.value }))} />
                <Input type="number" min="0" placeholder="Prix" value={varAjout.prix_vente_specifique} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => setVarAjout(v => ({ ...v, prix_vente_specifique: parseFloat(e.target.value) || "" }))} />
                <Input type="number" min="0" placeholder="Stock" value={varAjout.stock} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => setVarAjout(v => ({ ...v, stock: parseInt(e.target.value) || 0 }))} />
                <Input type="number" min="0" placeholder="Seuil" value={varAjout.seuil_alerte} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => setVarAjout(v => ({ ...v, seuil_alerte: parseInt(e.target.value) || 0 }))} />
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={ajouterVariation}><Layers className="w-3 h-3 mr-1" /> Ajouter</Button>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            {/* Stock Global Calculé - Affiché en haut */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700 font-medium mb-1">Stock Global Total</p>
              <p className="text-3xl font-bold text-blue-900">
                {recalculerStockGlobal(form.stocks_par_localisation || [], form.variations || [])} unités
              </p>
              <p className="text-xs text-blue-600 mt-2">
                = Somme des stocks par localisation ({(form.stocks_par_localisation || []).reduce((s, l) => s + (parseInt(l.quantite) || 0), 0)}) 
                + Somme des stocks par variation ({(form.variations || []).reduce((s, v) => s + (parseInt(v.stock) || 0), 0)})
              </p>
            </div>

            <div className="space-y-2">
              <Label>Seuil d'Alerte Global</Label>
              <Input type="number" min="0" value={form.seuil_alerte_global} 
                onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} 
                onChange={(e) => modifier("seuil_alerte_global", parseInt(e.target.value) || 0)} 
              />
              <p className="text-xs text-slate-400">Vous serez alerté quand le stock global descendra sous ce seuil</p>
            </div>

            {/* Stocks par Localisation */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Stocks par Localisation</p>
              {(form.stocks_par_localisation || []).length > 0 ? (
                <div className="space-y-2 mb-3">
                  {form.stocks_par_localisation.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 text-sm border border-slate-200">
                      <MapPin className="w-4 h-4 text-[#1a1f5e] flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-slate-900">{loc.ville}</span>
                        {loc.zone && <span className="text-slate-500"> / {loc.zone}</span>}
                      </div>
                      <span className="font-bold text-[#1a1f5e] text-base">{loc.quantite} unités</span>
                      <span className="text-xs text-slate-400">seuil: {loc.seuil_alerte}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => supprimerLocalisation(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mb-3">Aucune localisation définie</p>
              )}
              <div className="border-2 border-dashed border-[#1a1f5e]/30 rounded-lg p-3 bg-[#1a1f5e]/5">
                <p className="text-xs font-medium text-slate-700 mb-3">➕ Ajouter une nouvelle localisation</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input placeholder="Ville *" value={locAjout.ville} onChange={(e) => setLocAjout(l => ({ ...l, ville: e.target.value }))} />
                  <Input placeholder="Zone" value={locAjout.zone} onChange={(e) => setLocAjout(l => ({ ...l, zone: e.target.value }))} />
                  <Input type="number" min="0" placeholder="Quantité *" value={locAjout.quantite} 
                    onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} 
                    onChange={(e) => setLocAjout(l => ({ ...l, quantite: parseInt(e.target.value) || 0 }))} 
                  />
                  <Input type="number" min="0" placeholder="Seuil" value={locAjout.seuil_alerte} 
                    onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} 
                    onChange={(e) => setLocAjout(l => ({ ...l, seuil_alerte: parseInt(e.target.value) || 0 }))} 
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-[#1a1f5e] text-[#1a1f5e] hover:bg-[#1a1f5e] hover:text-white" 
                  onClick={ajouterLocalisation}
                  disabled={!locAjout.ville || locAjout.quantite <= 0}
                >
                  <Plus className="w-3 h-3 mr-1" /> Ajouter cette localisation
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSave} disabled={enCours} className="bg-[#1a1f5e] hover:bg-[#141952]">
            {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : produit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}