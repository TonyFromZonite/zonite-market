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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Plus, Edit2, Trash2, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GestionCoursiers() {
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [coursierEnCours, setCoursierEnCours] = useState(null);
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    type: "independant",
    vehicule: "",
    statut: "actif",
    notes: ""
  });
  const [zonesSelectionnees, setZonesSelectionnees] = useState([]);

  const queryClient = useQueryClient();

  const { data: coursiers = [] } = useQuery({
    queryKey: ["coursiers"],
    queryFn: () => base44.entities.Coursier.list()
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones"],
    queryFn: () => base44.entities.Zone.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Coursier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coursiers"] });
      fermerDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coursier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coursiers"] });
      fermerDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Coursier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coursiers"] });
    }
  });

  const ouvrirDialog = (coursier = null) => {
    if (coursier) {
      setCoursierEnCours(coursier);
      setFormData({
        nom: coursier.nom || "",
        telephone: coursier.telephone || "",
        email: coursier.email || "",
        type: coursier.type || "independant",
        vehicule: coursier.vehicule || "",
        statut: coursier.statut || "actif",
        notes: coursier.notes || ""
      });
      setZonesSelectionnees(coursier.zones_couvertes || []);
    } else {
      setCoursierEnCours(null);
      setFormData({
        nom: "",
        telephone: "",
        email: "",
        type: "independant",
        vehicule: "",
        statut: "actif",
        notes: ""
      });
      setZonesSelectionnees([]);
    }
    setDialogOuvert(true);
  };

  const fermerDialog = () => {
    setDialogOuvert(false);
    setCoursierEnCours(null);
  };

  const ajouterZone = () => {
    setZonesSelectionnees([...zonesSelectionnees, {
      zone_id: "",
      zone_nom: "",
      villes: [],
      prix_standard: 0,
      prix_express: 0,
      delai_standard: "24-48h",
      delai_express: "2-4h"
    }]);
  };

  const modifierZone = (index, champ, valeur) => {
    const nouvelles = [...zonesSelectionnees];
    nouvelles[index] = { ...nouvelles[index], [champ]: valeur };
    
    if (champ === "zone_id") {
      const zone = zones.find(z => z.id === valeur);
      if (zone) {
        nouvelles[index].zone_nom = zone.nom;
        nouvelles[index].villes = zone.villes || [];
      }
    }
    
    setZonesSelectionnees(nouvelles);
  };

  const supprimerZone = (index) => {
    setZonesSelectionnees(zonesSelectionnees.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      zones_couvertes: zonesSelectionnees.filter(z => z.zone_id)
    };

    if (coursierEnCours) {
      updateMutation.mutate({ id: coursierEnCours.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const supprimerCoursier = (id) => {
    if (confirm("Supprimer ce coursier ?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-[#1a1f5e]" />
            Gestion des Coursiers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérer les coursiers et leurs zones de livraison
          </p>
        </div>
        <Button
          onClick={() => ouvrirDialog()}
          className="bg-[#1a1f5e] hover:bg-[#141952]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Coursier
        </Button>
      </div>

      {/* Liste Coursiers */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coursiers.map((coursier) => (
          <Card key={coursier.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{coursier.nom}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={coursier.statut === "actif" ? "default" : "secondary"}>
                    {coursier.statut}
                  </Badge>
                  <Badge variant="outline">{coursier.type}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => ouvrirDialog(coursier)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => supprimerCoursier(coursier.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-slate-600">{coursier.telephone}</p>
              {coursier.vehicule && (
                <p className="text-slate-600">Véhicule: {coursier.vehicule}</p>
              )}
              
              {coursier.zones_couvertes && coursier.zones_couvertes.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-slate-500 font-medium mb-2">
                    Zones couvertes ({coursier.zones_couvertes.length})
                  </p>
                  <div className="space-y-1">
                    {coursier.zones_couvertes.slice(0, 2).map((zc, idx) => (
                      <div key={idx} className="bg-blue-50 rounded p-2">
                        <p className="font-medium text-xs text-blue-900">{zc.zone_nom}</p>
                        <p className="text-xs text-blue-700">
                          {zc.prix_standard?.toLocaleString()} FCFA
                        </p>
                      </div>
                    ))}
                    {coursier.zones_couvertes.length > 2 && (
                      <p className="text-xs text-slate-500">
                        +{coursier.zones_couvertes.length - 2} zones
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog Formulaire */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {coursierEnCours ? "Modifier le Coursier" : "Nouveau Coursier"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone *</Label>
                <Input
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independant">Indépendant</SelectItem>
                    <SelectItem value="agence">Agence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Véhicule</Label>
                <Input
                  value={formData.vehicule}
                  onChange={(e) => setFormData({ ...formData, vehicule: e.target.value })}
                  placeholder="Moto, Voiture..."
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
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Zones Couvertes */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Zones Couvertes et Tarification</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={ajouterZone}
                  variant="outline"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter Zone
                </Button>
              </div>

              <div className="space-y-3">
                {zonesSelectionnees.map((zc, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Zone {idx + 1}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => supprimerZone(idx)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Zone *</Label>
                        <Select
                          value={zc.zone_id}
                          onValueChange={(v) => modifierZone(idx, "zone_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.filter(z => z.statut === "actif").map(z => (
                              <SelectItem key={z.id} value={z.id}>
                                {z.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Prix Standard (FCFA) *</Label>
                        <Input
                          type="number"
                          value={zc.prix_standard}
                          onChange={(e) => modifierZone(idx, "prix_standard", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Prix Express (FCFA)</Label>
                        <Input
                          type="number"
                          value={zc.prix_express}
                          onChange={(e) => modifierZone(idx, "prix_express", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Délai Standard</Label>
                        <Input
                          value={zc.delai_standard}
                          onChange={(e) => modifierZone(idx, "delai_standard", e.target.value)}
                          placeholder="24-48h"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                {coursierEnCours ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}