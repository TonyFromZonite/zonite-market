import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ImagePlus, X, Plus, MapPin, Trash2, Layers } from "lucide-react";

const initVariationDef = { attributs: "", prix_vente_specifique: null };

export default function DialogProduit({ open, onOpenChange, produit, form, setForm, categories, onSave, enCours }) {
  const [varDefAjout, setVarDefAjout] = useState(initVariationDef);
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

  // ── Variations Definition ────────────────────────────────────────────────────
  const ajouterVariationDef = () => {
    if (!varDefAjout.attributs.trim()) return;
    const variation = { 
      attributs: varDefAjout.attributs.trim(),
      ...(varDefAjout.prix_vente_specifique > 0 ? { prix_vente_specifique: varDefAjout.prix_vente_specifique } : {})
    };
    setForm(p => ({ ...p, variations_definition: [...(p.variations_definition || []), variation] }));
    setVarDefAjout(initVariationDef);
  };

  const supprimerVariationDef = (idx) => {
    const attrSuppr = form.variations_definition[idx].attributs;
    // Supprimer aussi des zones
    const nouvellesLocs = (form.stocks_par_localisation || []).map(loc => ({
      ...loc,
      variations_stock: (loc.variations_stock || []).filter(v => v.attributs !== attrSuppr)
    }));
    setForm(p => ({
      ...p,
      variations_definition: p.variations_definition.filter((_, i) => i !== idx),
      stocks_par_localisation: nouvellesLocs
    }));
  };

  const modifierVariationDef = (idx, champ, valeur) => {
    setForm(p => {
      const vars = [...(p.variations_definition || [])];
      if (champ === 'prix_vente_specifique') {
        if (valeur === null || valeur === '' || valeur <= 0) {
          const { prix_vente_specifique, ...rest } = vars[idx];
          vars[idx] = rest;
        } else {
          vars[idx] = { ...vars[idx], prix_vente_specifique: valeur };
        }
      } else {
        vars[idx] = { ...vars[idx], [champ]: valeur };
      }
      return { ...p, variations_definition: vars };
    });
  };

  // ── Localisations avec variations ────────────────────────────────────────────
  const ajouterLocalisation = () => {
    const nouvelleLoc = {
      ville: "",
      zone: "",
      seuil_alerte: 5,
      variations_stock: (form.variations_definition || []).map(v => ({ attributs: v.attributs, quantite: 0 }))
    };
    setForm(p => ({ ...p, stocks_par_localisation: [...(p.stocks_par_localisation || []), nouvelleLoc] }));
  };

  const supprimerLocalisation = (idx) => {
    setForm(p => ({ ...p, stocks_par_localisation: p.stocks_par_localisation.filter((_, i) => i !== idx) }));
  };

  const modifierLocalisation = (idx, champ, valeur) => {
    setForm(p => {
      const locs = [...(p.stocks_par_localisation || [])];
      locs[idx] = { ...locs[idx], [champ]: valeur };
      return { ...p, stocks_par_localisation: locs };
    });
  };

  const modifierVariationZone = (idxLoc, idxVar, quantite) => {
    setForm(p => {
      const locs = [...(p.stocks_par_localisation || [])];
      const vars = [...(locs[idxLoc].variations_stock || [])];
      vars[idxVar] = { ...vars[idxVar], quantite: parseInt(quantite) || 0 };
      locs[idxLoc] = { ...locs[idxLoc], variations_stock: vars };
      return { ...p, stocks_par_localisation: locs };
    });
  };

  // Calcul du stock global : somme de toutes les variations dans toutes les zones
  const calculerStockGlobal = () => {
    return (form.stocks_par_localisation || []).reduce((total, loc) => {
      const stockZone = (loc.variations_stock || []).reduce((s, v) => s + (parseInt(v.quantite) || 0), 0);
      return total + stockZone;
    }, 0);
  };

  const calculerStockZone = (loc) => {
    return (loc.variations_stock || []).reduce((s, v) => s + (parseInt(v.quantite) || 0), 0);
  };

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produit ? "Modifier le Produit" : "Nouveau Produit"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="infos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="infos">Infos</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="variations">Variations</TabsTrigger>
            <TabsTrigger value="stock">Stock par Zone</TabsTrigger>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="text-blue-900 font-medium">ℹ️ Définissez d'abord les variations possibles</p>
              <p className="text-blue-700 text-xs mt-1">Exemple: "Rouge / M", "Bleu / L", etc. Vous définirez ensuite les quantités par zone dans l'onglet Stock.</p>
            </div>

            {(form.variations_definition || []).length > 0 && (
              <div className="space-y-2">
                {form.variations_definition.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3 items-center border border-slate-200">
                    <Input className="col-span-2" placeholder="Rouge / M" value={v.attributs} onChange={(e) => modifierVariationDef(idx, "attributs", e.target.value)} />
                    <div className="flex gap-1 items-center">
                      <Input type="number" min="0" placeholder="Prix spécifique" value={v.prix_vente_specifique || ""} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => modifierVariationDef(idx, "prix_vente_specifique", e.target.value === "" ? null : parseFloat(e.target.value))} />
                      <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => supprimerVariationDef(idx)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border border-dashed border-slate-300 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">➕ Ajouter une variation</p>
              <div className="grid grid-cols-2 gap-2 items-end">
                <Input placeholder="Attributs (ex: Rouge / M) *" value={varDefAjout.attributs} onChange={(e) => setVarDefAjout(v => ({ ...v, attributs: e.target.value }))} />
                <Input type="number" min="0" placeholder="Prix spécifique (opt.)" value={varDefAjout.prix_vente_specifique || ""} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => setVarDefAjout(v => ({ ...v, prix_vente_specifique: e.target.value === "" ? null : parseFloat(e.target.value) }))} />
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={ajouterVariationDef}><Layers className="w-3 h-3 mr-1" /> Ajouter</Button>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            {/* Stock Global Calculé */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700 font-medium mb-1">📊 Stock Global Total (Calculé automatiquement)</p>
              <p className="text-3xl font-bold text-blue-900">{calculerStockGlobal()} unités</p>
              <p className="text-xs text-blue-600 mt-2">= Somme de toutes les variations dans toutes les zones</p>
            </div>

            <div className="space-y-2">
              <Label>Seuil d'Alerte Global</Label>
              <Input type="number" min="0" value={form.seuil_alerte_global} 
                onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} 
                onChange={(e) => modifier("seuil_alerte_global", parseInt(e.target.value) || 0)} 
              />
              <p className="text-xs text-slate-400">Vous serez alerté quand le stock global descendra sous ce seuil</p>
            </div>

            {/* Zones de stockage */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Zones de Stockage</p>
                <Button type="button" variant="outline" size="sm" onClick={ajouterLocalisation} disabled={(form.variations_definition || []).length === 0}>
                  <Plus className="w-3 h-3 mr-1" /> Nouvelle Zone
                </Button>
              </div>

              {(form.variations_definition || []).length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-3">
                  ⚠️ Définissez d'abord des variations dans l'onglet "Variations" avant d'ajouter des zones.
                </div>
              )}

              {(form.stocks_par_localisation || []).length === 0 && (form.variations_definition || []).length > 0 && (
                <p className="text-sm text-slate-400 mb-3">Aucune zone définie. Cliquez sur "Nouvelle Zone" pour commencer.</p>
              )}

              <div className="space-y-3">
                {(form.stocks_par_localisation || []).map((loc, idxLoc) => (
                  <div key={idxLoc} className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input placeholder="Ville *" value={loc.ville} onChange={(e) => modifierLocalisation(idxLoc, "ville", e.target.value)} />
                        <Input placeholder="Zone" value={loc.zone} onChange={(e) => modifierLocalisation(idxLoc, "zone", e.target.value)} />
                        <Input type="number" min="0" placeholder="Seuil alerte zone" value={loc.seuil_alerte} onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} onChange={(e) => modifierLocalisation(idxLoc, "seuil_alerte", parseInt(e.target.value) || 0)} />
                      </div>
                      <Button variant="ghost" size="icon" className="ml-2" onClick={() => supprimerLocalisation(idxLoc)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Stock de cette zone : <span className="text-[#1a1f5e] font-bold text-sm">{calculerStockZone(loc)} unités</span>
                      </p>
                      <div className="space-y-2">
                        {(loc.variations_stock || []).map((varStock, idxVar) => (
                          <div key={idxVar} className="grid grid-cols-2 gap-2 items-center">
                            <Label className="text-xs text-slate-600">{varStock.attributs}</Label>
                            <Input 
                              type="number" 
                              min="0" 
                              placeholder="Quantité" 
                              value={varStock.quantite} 
                              onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }} 
                              onChange={(e) => modifierVariationZone(idxLoc, idxVar, e.target.value)} 
                              className="text-right font-medium"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
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