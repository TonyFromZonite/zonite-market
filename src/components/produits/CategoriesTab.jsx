import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { showSuccess, showError } from "@/components/NotificationSystem";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag, Loader2 } from "lucide-react";

export default function CategoriesTab() {
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
        await adminApi.updateCategorie(edite.id, form);
        showSuccess("Catégorie modifiée");
      } else {
        await adminApi.createCategorie(form);
        showSuccess("Catégorie créée");
      }
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOuvert(false);
    } catch (err) {
      showError("Erreur", err.message);
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async (cat) => {
    setEnCours(true);
    try {
      await adminApi.deleteCategorie(cat.id);
      showSuccess("Catégorie supprimée");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setConfirmSuppression(null);
    } catch (err) {
      showError("Erreur", err.message);
    } finally {
      setEnCours(false);
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
          <p className="text-sm text-slate-600">Êtes-vous sûr de vouloir supprimer <strong>"{confirmSuppression?.nom}"</strong> ?</p>
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