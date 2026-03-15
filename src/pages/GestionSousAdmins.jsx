import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, UserCog, Eye, EyeOff, ShieldCheck } from "lucide-react";

const MODULES_DISPONIBLES = [
  { id: "TableauDeBord",     label: "Tableau de Bord" },
  { id: "NouvelleVente",     label: "Nouvelle Vente" },
  { id: "Commandes",         label: "Commandes Admin" },
  { id: "CommandesVendeurs", label: "Commandes Vendeurs" },
  { id: "Produits",          label: "Produits" },
  { id: "Vendeurs",          label: "Vendeurs" },
  { id: "Livraisons",        label: "Livraisons" },
  { id: "SupportAdmin",      label: "Support Vendeurs" },
  { id: "JournalAudit",      label: "Journal d'Audit & Rapports" },
];

const VIDE = {
  nom_complet: "",
  nom_role: "",
  username: "",
  email: "",
  mot_de_passe: "",
  permissions: [],
  statut: "actif",
  notes: "",
};

export default function GestionSousAdmins() {
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [form, setForm] = useState(VIDE);
  const [editing, setEditing] = useState(null);
  const [mdpVisible, setMdpVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const queryClient = useQueryClient();

  const { data: sousAdmins = [], isLoading } = useQuery({
    queryKey: ["sous_admins"],
    queryFn: () => base44.entities.SousAdmin.list("-created_date"),
  });

  const ouvrirCreation = () => {
    setEditing(null);
    setForm(VIDE);
    setMdpVisible(false);
    setDialogOuvert(true);
  };

  const ouvrirEdition = (sa) => {
    setEditing(sa);
    setForm({ ...sa, mot_de_passe: "" });
    setMdpVisible(false);
    setDialogOuvert(true);
  };

  const togglePermission = (id) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter((p) => p !== id)
        : [...f.permissions, id],
    }));
  };

  const toutSelectionner = () => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.length === MODULES_DISPONIBLES.length
        ? []
        : MODULES_DISPONIBLES.map((m) => m.id),
    }));
  };

  const sauvegarder = async () => {
    if (!form.nom_complet || !form.nom_role || !form.username || !form.email) return;
    if (!editing && !form.mot_de_passe) return; // Mot de passe requis pour création
    setChargement(true);
    try {
      const data = {
        nom_complet: form.nom_complet,
        nom_role: form.nom_role,
        username: form.username,
        email: form.email,
        permissions: form.permissions,
        statut: form.statut,
        notes: form.notes,
        mot_de_passe_clair: form.mot_de_passe, // transmis pour créer le compte Base44 + email
      };
      if (form.mot_de_passe) {
        const response = await base44.functions.invoke('hashPassword', {
          password: form.mot_de_passe
        });
        data.mot_de_passe_hash = response.data.hashedPassword;
      }
      if (editing) {
         await adminApi.updateSousAdmin(editing.id, data);
       } else {
         await adminApi.createSousAdmin(data);
       }
      queryClient.invalidateQueries({ queryKey: ["sous_admins"] });
      setDialogOuvert(false);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      alert("Erreur : " + (err.message || "Échec de la sauvegarde"));
    } finally {
      setChargement(false);
    }
  };

  const supprimer = async (id) => {
    if (!confirm("Supprimer ce sous-administrateur ?")) return;
    await adminApi.deleteSousAdmin(id);
    queryClient.invalidateQueries({ queryKey: ["sous_admins"] });
  };

  const toggleStatut = async (sa) => {
    await adminApi.updateSousAdmin(sa.id, {
      statut: sa.statut === "actif" ? "suspendu" : "actif",
    });
    queryClient.invalidateQueries({ queryKey: ["sous_admins"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sous-Administrateurs</h2>
          <p className="text-sm text-slate-500">Créez des comptes avec des accès limités aux modules que vous choisissez.</p>
        </div>
        <Button onClick={ouvrirCreation} className="bg-[#1a1f5e] hover:bg-[#141952]">
          <Plus className="w-4 h-4 mr-2" /> Nouveau sous-admin
        </Button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : sousAdmins.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <UserCog className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucun sous-administrateur créé.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sousAdmins.map((sa) => (
            <div key={sa.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#1a1f5e]" />
                  <span className="font-semibold text-slate-900">{sa.nom_complet}</span>
                  <Badge className={sa.statut === "actif" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                    {sa.statut}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">{sa.nom_role}</span> · @{sa.username} · {sa.email}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(sa.permissions || []).map((p) => {
                    const mod = MODULES_DISPONIBLES.find((m) => m.id === p);
                    return mod ? (
                      <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium">{mod.label}</span>
                    ) : null;
                  })}
                  {(sa.permissions || []).length === 0 && (
                    <span className="text-xs text-slate-400">Aucune permission</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => toggleStatut(sa)}>
                  {sa.statut === "actif" ? "Suspendre" : "Activer"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => ouvrirEdition(sa)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => supprimer(sa.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog création/édition */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le sous-admin" : "Nouveau sous-administrateur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom complet *</Label>
                <Input value={form.nom_complet} onChange={(e) => setForm({ ...form, nom_complet: e.target.value })} placeholder="ex: Jean Dupont" />
              </div>
              <div>
                <Label>Titre du rôle *</Label>
                <Input value={form.nom_role} onChange={(e) => setForm({ ...form, nom_role: e.target.value })} placeholder="ex: Modérateur commandes" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom d'utilisateur *</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex: jean.dupont" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" disabled={!!editing} />
              </div>
            </div>
            <div>
              <Label>{editing ? "Nouveau mot de passe (laisser vide = inchangé)" : "Mot de passe *"}</Label>
              <div className="relative">
                <Input
                  type={mdpVisible ? "text" : "password"}
                  value={form.mot_de_passe}
                  onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setMdpVisible(!mdpVisible)}
                >
                  {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Modules accessibles</Label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={toutSelectionner}
                >
                  {form.permissions.length === MODULES_DISPONIBLES.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 bg-slate-50 rounded-lg p-3">
                {MODULES_DISPONIBLES.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.permissions.includes(m.id)}
                      onCheckedChange={() => togglePermission(m.id)}
                    />
                    <span className="text-sm text-slate-700">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: gère uniquement les livraisons de Yaoundé" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
              <Button
                className="bg-[#1a1f5e] hover:bg-[#141952]"
                onClick={sauvegarder}
                disabled={chargement || !form.nom_complet || !form.nom_role || !form.username || !form.email}
              >
                {chargement ? "Enregistrement..." : editing ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}