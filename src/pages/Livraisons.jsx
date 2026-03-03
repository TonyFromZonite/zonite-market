import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Truck, MapPin, X, ChevronDown, ChevronUp, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const initZone = { ville: "", quartiers: "", prix_standard: 0, prix_express: 0, delai_standard: "24-48h", delai_express: "2-4h" };
const initForm = { nom: "", telephone: "", vehicule: "", notes: "", statut: "actif", zones_couvertes: [] };
const fmt = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function Livraisons() {
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [livreurEdite, setLivreurEdite] = useState(null);
  const [form, setForm] = useState(initForm);
  const [enCours, setEnCours] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  const { data: livraisons = [], isLoading } = useQuery({
    queryKey: ["livraisons"],
    queryFn: () => base44.entities.Livraison.list("-created_date"),
  });

  const modifier = (champ, valeur) => setForm((p) => ({ ...p, [champ]: valeur }));

  const ouvrir = (l) => {
    if (l) {
      setLivreurEdite(l);
      setForm({ ...initForm, ...l, zones_couvertes: l.zones_couvertes || [] });
    } else {
      setLivreurEdite(null);
      setForm(initForm);
    }
    setDialogOuvert(true);
  };

  const ajouterZone = () => setForm(p => ({ ...p, zones_couvertes: [...(p.zones_couvertes || []), { ...initZone }] }));

  const modifierZone = (i, champ, val) => setForm(p => {
    const zones = [...(p.zones_couvertes || [])];
    zones[i] = { ...zones[i], [champ]: val };
    return { ...p, zones_couvertes: zones };
  });

  const supprimerZone = (i) => setForm(p => {
    const zones = [...(p.zones_couvertes || [])];
    zones.splice(i, 1);
    return { ...p, zones_couvertes: zones };
  });

  const sauvegarder = async () => {
    if (!form.nom.trim()) return;
    setEnCours(true);
    if (livreurEdite) {
      await base44.entities.Livraison.update(livreurEdite.id, form);
      await base44.entities.JournalAudit.create({ action: "Livreur modifié", module: "livraison", details: `Livreur ${form.nom} modifié`, entite_id: livreurEdite.id });
    } else {
      await base44.entities.Livraison.create(form);
      await base44.entities.JournalAudit.create({ action: "Livreur créé", module: "livraison", details: `Nouveau livreur: ${form.nom}` });
    }
    queryClient.invalidateQueries({ queryKey: ["livraisons"] });
    setDialogOuvert(false);
    setEnCours(false);
  };

  const supprimer = async (l) => {
    if (!confirm(`Supprimer le livreur "${l.nom}" ?`)) return;
    await base44.entities.Livraison.delete(l.id);
    await base44.entities.JournalAudit.create({ action: "Livreur supprimé", module: "livraison", details: `Livreur ${l.nom} supprimé`, entite_id: l.id });
    queryClient.invalidateQueries({ queryKey: ["livraisons"] });
  };

  const statutBadge = (s) => ({
    actif: "bg-emerald-100 text-emerald-700",
    inactif: "bg-slate-100 text-slate-600",
    en_livraison: "bg-blue-100 text-blue-700",
  }[s] || "bg-slate-100 text-slate-600");

  if (isLoading) {
    return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => ouvrir(null)} className="bg-[#1a1f5e] hover:bg-[#141952]">
          <Plus className="w-4 h-4 mr-2" /> Nouveau Livreur
        </Button>
      </div>

      {/* Liste des livreurs */}
      <div className="space-y-3">
        {livraisons.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>Aucun livreur enregistré</p>
          </div>
        )}
        {livraisons.map((l) => {
          const zones = l.zones_couvertes || [];
          const isOpen = expanded === l.id;
          return (
            <div key={l.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header livreur */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 bg-[#1a1f5e]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-[#1a1f5e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{l.nom}</span>
                    <Badge className={statutBadge(l.statut)}>{l.statut === "actif" ? "Actif" : l.statut === "en_livraison" ? "En livraison" : "Inactif"}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                    {l.telephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{l.telephone}</span>}
                    {l.vehicule && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{l.vehicule}</span>}
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{zones.length} zone{zones.length > 1 ? "s" : ""} couverte{zones.length > 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => ouvrir(l)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => supprimer(l)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  {zones.length > 0 && (
                    <Button variant="ghost" size="icon" onClick={() => setExpanded(isOpen ? null : l.id)}>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Zones détail */}
              {isOpen && zones.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {zones.map((z, i) => (
                      <div key={i} className="bg-white rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span className="font-semibold text-slate-900 text-sm">{z.ville}</span>
                        </div>
                        {z.quartiers && <p className="text-xs text-slate-500 mb-2">{z.quartiers}</p>}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 rounded p-2">
                            <p className="text-slate-500 font-medium">Standard</p>
                            <p className="font-bold text-slate-800 mt-0.5">{fmt(z.prix_standard)}</p>
                            <p className="text-slate-400 mt-0.5">{z.delai_standard || "—"}</p>
                          </div>
                          <div className="bg-yellow-50 rounded p-2">
                            <p className="text-yellow-700 font-medium">Express</p>
                            <p className="font-bold text-yellow-800 mt-0.5">{fmt(z.prix_express)}</p>
                            <p className="text-yellow-600 mt-0.5">{z.delai_express || "—"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog création/modification */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{livreurEdite ? "Modifier le Livreur" : "Nouveau Livreur"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Infos de base */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Nom du livreur *</Label>
                <Input value={form.nom} onChange={(e) => modifier("nom", e.target.value)} placeholder="Ex: Mamadou Diallo" />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Téléphone</Label>
                <Input value={form.telephone} onChange={(e) => modifier("telephone", e.target.value)} placeholder="Ex: 07 00 00 00 00" />
              </div>
              <div className="space-y-2">
                <Label>Véhicule</Label>
                <Input value={form.vehicule} onChange={(e) => modifier("vehicule", e.target.value)} placeholder="Ex: Moto, Voiture..." />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => modifier("statut", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="en_livraison">En livraison</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => modifier("notes", e.target.value)} placeholder="Notes sur ce livreur..." rows={2} />
              </div>
            </div>

            {/* Zones de livraison */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" /> Zones de Livraison
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={ajouterZone}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une zone
                </Button>
              </div>

              {(form.zones_couvertes || []).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                  Aucune zone définie. Cliquez sur "Ajouter une zone".
                </p>
              )}

              <div className="space-y-4">
                {(form.zones_couvertes || []).map((z, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative">
                    <button type="button" onClick={() => supprimerZone(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Ville *</Label>
                        <Input value={z.ville} onChange={(e) => modifierZone(i, "ville", e.target.value)} placeholder="Ex: Abidjan" className="bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quartiers / Zones</Label>
                        <Input value={z.quartiers} onChange={(e) => modifierZone(i, "quartiers", e.target.value)} placeholder="Ex: Cocody, Plateau..." className="bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix Standard (FCFA)</Label>
                        <Input type="number" min="0" value={z.prix_standard} onChange={(e) => modifierZone(i, "prix_standard", parseFloat(e.target.value) || 0)} className="bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Délai Standard</Label>
                        <Input value={z.delai_standard} onChange={(e) => modifierZone(i, "delai_standard", e.target.value)} placeholder="Ex: 24-48h" className="bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix Express (FCFA)</Label>
                        <Input type="number" min="0" value={z.prix_express} onChange={(e) => modifierZone(i, "prix_express", parseFloat(e.target.value) || 0)} className="bg-yellow-50" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Délai Express</Label>
                        <Input value={z.delai_express} onChange={(e) => modifierZone(i, "delai_express", e.target.value)} placeholder="Ex: 2-4h" className="bg-yellow-50" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : livreurEdite ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}