import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GestionZones() {
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [zoneEnCours, setZoneEnCours] = useState(null);
  const [formData, setFormData] = useState({
    nom: "",
    villes: "",
    points_livraison: "",
    description: "",
    statut: "actif"
  });

  const queryClient = useQueryClient();

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["zones"],
    queryFn: () => base44.entities.Zone.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Zone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      fermerDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Zone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      fermerDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Zone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    }
  });

  const ouvrirDialog = (zone = null) => {
    if (zone) {
      setZoneEnCours(zone);
      setFormData({
        nom: zone.nom || "",
        villes: (zone.villes || []).join(", "),
        points_livraison: (zone.points_livraison || []).join(", "),
        description: zone.description || "",
        statut: zone.statut || "actif"
      });
    } else {
      setZoneEnCours(null);
      setFormData({
        nom: "",
        villes: "",
        points_livraison: "",
        description: "",
        statut: "actif"
      });
    }
    setDialogOuvert(true);
  };

  const fermerDialog = () => {
    setDialogOuvert(false);
    setZoneEnCours(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      nom: formData.nom,
      villes: formData.villes.split(",").map(v => v.trim()).filter(Boolean),
      points_livraison: formData.points_livraison.split(",").map(p => p.trim()).filter(Boolean),
      description: formData.description,
      statut: formData.statut
    };

    if (zoneEnCours) {
      updateMutation.mutate({ id: zoneEnCours.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const supprimerZone = (id) => {
    if (confirm("Supprimer cette zone de livraison ?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-[#1a1f5e]" />
            Gestion des Zones de Livraison
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Définir les zones géographiques pour organiser la logistique
          </p>
        </div>
        <Button
          onClick={() => ouvrirDialog()}
          className="bg-[#1a1f5e] hover:bg-[#141952]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Zone
        </Button>
      </div>

      {/* Liste des Zones */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone) => (
          <Card key={zone.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">{zone.nom}</h3>
                <Badge variant={zone.statut === "actif" ? "default" : "secondary"}>
                  {zone.statut}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => ouvrirDialog(zone)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => supprimerZone(zone.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {zone.description && (
              <p className="text-sm text-slate-600 mb-3">{zone.description}</p>
            )}

            <div className="space-y-2 text-sm">
              {zone.villes && zone.villes.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Villes</p>
                  <div className="flex flex-wrap gap-1">
                    {zone.villes.map((ville, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {ville}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {zone.points_livraison && zone.points_livraison.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Points de livraison</p>
                  <p className="text-xs text-slate-600">
                    {zone.points_livraison.slice(0, 3).join(", ")}
                    {zone.points_livraison.length > 3 && ` +${zone.points_livraison.length - 3}`}
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog Formulaire */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {zoneEnCours ? "Modifier la Zone" : "Nouvelle Zone"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la Zone *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Zone Centre Douala"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Villes (séparées par des virgules)</Label>
              <Input
                value={formData.villes}
                onChange={(e) => setFormData({ ...formData, villes: e.target.value })}
                placeholder="Ex: Douala, Yaoundé"
              />
              <p className="text-xs text-slate-500">
                Entrez les villes couvertes par cette zone
              </p>
            </div>

            <div className="space-y-2">
              <Label>Points de Livraison (séparés par des virgules)</Label>
              <Textarea
                value={formData.points_livraison}
                onChange={(e) => setFormData({ ...formData, points_livraison: e.target.value })}
                placeholder="Ex: Akwa, Bonaberi, Deido"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la zone..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(v) => setFormData({ ...formData, statut: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={fermerDialog}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#1a1f5e] hover:bg-[#141952]"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {zoneEnCours ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}