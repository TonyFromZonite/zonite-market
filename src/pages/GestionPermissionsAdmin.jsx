import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { showSuccess, showError, showWarning } from "@/components/NotificationSystem";

const MODULES_DISPONIBLES = [
  "TableauDeBord",
  "NouvelleVente",
  "Commandes",
  "GestionCommandes",
  "CommandesVendeurs",
  "Produits",
  "Vendeurs",
  "Livraisons",
  "SupportAdmin",
  "JournalAudit",
  "GestionSousAdmins",
  "ConfigurationApp",
];

export default function GestionPermissionsAdmin() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    admin_email: "",
    admin_nom: "",
    permissions: [],
    actif: true,
  });

  // Charger les permissions
  useEffect(() => {
    const chargerPermissions = async () => {
      try {
        const res = await adminApi.listAdminPermissions();
        setPermissions(res.result || []);
      } catch (error) {
        showError("Erreur au chargement des permissions");
      } finally {
        setLoading(false);
      }
    };
    chargerPermissions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.admin_email || formData.permissions.length === 0) {
      showWarning("Email et au moins une permission requis");
      return;
    }

    try {
      if (editingId) {
        await adminApi.updateAdminPermissions(editingId, formData);
        showSuccess("Permissions mises à jour");
      } else {
        await adminApi.createAdminPermissions(formData);
        showSuccess("Admin et permissions créés");
      }
      
      // Recharger
      const res = await adminApi.listAdminPermissions();
      setPermissions(res.result || []);
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      showError("Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cet admin et ses permissions ?")) return;
    
    try {
      await adminApi.deleteAdminPermissions(id);
      setPermissions(permissions.filter(p => p.id !== id));
      showSuccess("Admin supprimé");
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  const handleEdit = (perm) => {
    setFormData({
      admin_email: perm.admin_email,
      admin_nom: perm.admin_nom,
      permissions: perm.permissions || [],
      actif: perm.actif,
    });
    setEditingId(perm.id);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      admin_email: "",
      admin_nom: "",
      permissions: [],
      actif: true,
    });
    setEditingId(null);
  };

  const togglePermission = (module) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(module)
        ? prev.permissions.filter(p => p !== module)
        : [...prev.permissions, module],
    }));
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Permissions Admin</h1>
          <p className="text-sm text-slate-600 mt-1">Gérez les accès aux modules pour chaque administrateur</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#F5C518] hover:bg-[#F5C518]/90 text-slate-900">
              <Plus className="w-4 h-4" />
              Nouvel Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier les permissions" : "Ajouter un administrateur"}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Email de l'admin</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                  disabled={!!editingId}
                  className="disabled:opacity-50"
                />
              </div>

              {/* Nom */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Nom complet</label>
                <Input
                  placeholder="Nom complet"
                  value={formData.admin_nom}
                  onChange={(e) => setFormData({...formData, admin_nom: e.target.value})}
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-3">Permissions</label>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {MODULES_DISPONIBLES.map((module) => (
                    <label key={module} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition">
                      <Checkbox
                        checked={formData.permissions.includes(module)}
                        onCheckedChange={() => togglePermission(module)}
                      />
                      <span className="text-sm text-slate-700">{module}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#1a1f5e] hover:bg-[#1a1f5e]/90">
                  {editingId ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des admins */}
      <div className="grid gap-4">
        {permissions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">Aucun administrateur configuré</p>
          </Card>
        ) : (
          permissions.map((perm) => (
            <Card key={perm.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{perm.admin_nom || "Sans nom"}</h3>
                      <p className="text-sm text-slate-600">{perm.admin_email}</p>
                    </div>
                    {perm.actif && (
                      <Badge className="bg-green-100 text-green-800">Actif</Badge>
                    )}
                    {!perm.actif && (
                      <Badge className="bg-red-100 text-red-800">Inactif</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-700">Modules autorisés :</p>
                    <div className="flex flex-wrap gap-2">
                      {perm.permissions && perm.permissions.length > 0 ? (
                        perm.permissions.map((module) => (
                          <Badge key={module} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {module}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Aucune permission</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(perm)}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(perm.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}