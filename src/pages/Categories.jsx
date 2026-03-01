import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";

export default function Categories() {
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [edite, setEdite] = useState(null);
  const [form, setForm] = useState({ nom: "", description: "" });
  const [enCours, setEnCours] = useState(false);
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
    if (edite) {
      await base44.entities.Categorie.update(edite.id, form);
    } else {
      await base44.entities.Categorie.create(form);
    }
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    setDialogOuvert(false);
    setEnCours(false);
  };

  const supprimer = async (cat) => {
    if (!confirm(`Supprimer la catégorie "${cat.nom}" ?`)) return;
    await base44.entities.Categorie.delete(cat.id);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
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
        {isLoading && Array(6).fill(0).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
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
              <Button variant="ghost" size="icon" onClick={() => ouvrir(cat)}>
                <Pencil className="w-4 h-4 text-slate-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => supprimer(cat)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && categories.length === 0 && (
          <div className="col-span-3 text-center py-10 text-slate-400">Aucune catégorie. Créez-en une !</div>
        )}
      </div>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{edite ? "Modifier la Catégorie" : "Nouvelle Catégorie"}</DialogTitle>
          </DialogHeader>
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
    </div>
  );
}