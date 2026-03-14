import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package } from "lucide-react";

/**
 * Sélecteur dynamique de localisation et variation
 * Cascade : Produit → Ville → Zone → Variation
 */
export default function SelecteurLocalisation({ 
  produit, 
  value, 
  onChange,
  disabled,
  livraisons = []
}) {
  const [disponibilite, setDisponibilite] = useState(null);
  const [villeSelectionnee, setVilleSelectionnee] = useState(value?.ville || "");
  const [zoneSelectionnee, setZoneSelectionnee] = useState(value?.zone || "");
  const [variationSelectionnee, setVariationSelectionnee] = useState(value?.variation || "");

  // Charger la disponibilité quand le produit change
  useEffect(() => {
    if (produit?.id) {
      chargerDisponibilite();
    } else {
      resetSelection();
    }
  }, [produit?.id]);

  const chargerDisponibilite = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const result = await base44.functions.invoke('getProductAvailability', {
        produit_id: produit.id
      });
      setDisponibilite(result.data);
      resetSelection();
    } catch (error) {
      console.error('Erreur chargement disponibilité:', error);
      setDisponibilite(null);
    }
  };

  const resetSelection = () => {
    setVilleSelectionnee("");
    setZoneSelectionnee("");
    setVariationSelectionnee("");
    onChange?.({ ville: "", zone: "", variation: "", stockDisponible: 0 });
  };

  const handleVilleChange = (ville) => {
    setVilleSelectionnee(ville);
    setZoneSelectionnee("");
    setVariationSelectionnee("");
    onChange?.({ ville, zone: "", variation: "", stockDisponible: 0 });
  };

  const handleZoneChange = (zone) => {
    setZoneSelectionnee(zone);
    setVariationSelectionnee("");
    const prixLivraison = getPrixLivraisonZone(villeSelectionnee, zone);
    onChange?.({ ville: villeSelectionnee, zone, variation: "", stockDisponible: 0, prixLivraison });
  };

  const handleVariationChange = (variation) => {
    setVariationSelectionnee(variation);
    const stock = getStockVariation(variation);
    const prixLivraison = getPrixLivraisonZone(villeSelectionnee, zoneSelectionnee);
    onChange?.({ 
      ville: villeSelectionnee, 
      zone: zoneSelectionnee, 
      variation, 
      stockDisponible: stock,
      prixLivraison
    });
  };

  const getPrixLivraisonZone = (ville, zone) => {
    for (const livraison of livraisons) {
      if (livraison.zones_couvertes) {
        const zoneCouv = livraison.zones_couvertes.find(
          zc => zc.ville === ville && (zc.quartiers === zone || zc.quartiers?.includes(zone))
        );
        if (zoneCouv) {
          return zoneCouv.prix_standard || 0;
        }
      }
    }
    return 0;
  };

  const getVillesDisponibles = () => {
    return disponibilite?.villes || [];
  };

  const getZonesDisponibles = () => {
    if (!villeSelectionnee || !disponibilite) return [];
    const ville = disponibilite.villes.find(v => v.ville === villeSelectionnee);
    return ville?.zones || [];
  };

  const getVariationsDisponibles = () => {
    if (!villeSelectionnee || !zoneSelectionnee || !disponibilite) return [];
    const ville = disponibilite.villes.find(v => v.ville === villeSelectionnee);
    const zone = ville?.zones.find(z => z.zone === zoneSelectionnee);
    return zone?.variations || [];
  };

  const getStockVariation = (variation) => {
    const variations = getVariationsDisponibles();
    const v = variations.find(vr => vr.attributs === variation);
    return v?.quantite || 0;
  };

  if (!produit) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Sélectionnez d'abord un produit
      </div>
    );
  }

  if (!disponibilite) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500 animate-pulse">
        Chargement des disponibilités...
      </div>
    );
  }

  if (!disponibilite.disponible) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-sm text-red-700">
        <MapPin className="w-8 h-8 mx-auto mb-2" />
        {disponibilite.raison}
      </div>
    );
  }

  const villes = getVillesDisponibles();
  const zones = getZonesDisponibles();
  const variations = getVariationsDisponibles();

  return (
    <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-slate-600" />
        <h3 className="font-semibold text-sm text-slate-900">Localisation & Variation</h3>
        <Badge variant="outline" className="ml-auto text-xs">
          {villes.length} ville{villes.length > 1 ? 's' : ''} disponible{villes.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Sélection Ville */}
      <div className="space-y-2">
        <Label>Ville *</Label>
        <Select 
          value={villeSelectionnee} 
          onValueChange={handleVilleChange}
          disabled={disabled || villes.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir une ville" />
          </SelectTrigger>
          <SelectContent>
            {villes.map(v => (
              <SelectItem key={v.ville} value={v.ville}>
                {v.ville} ({v.zones_disponibles} zone{v.zones_disponibles > 1 ? 's' : ''})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sélection Zone */}
      {villeSelectionnee && (
        <div className="space-y-2 animate-slide-in">
          <Label>Zone *</Label>
          <Select 
            value={zoneSelectionnee} 
            onValueChange={handleZoneChange}
            disabled={disabled || zones.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une zone" />
            </SelectTrigger>
            <SelectContent>
              {zones.map(z => (
                <SelectItem key={z.zone} value={z.zone}>
                  {z.zone} ({z.variations.length} variation{z.variations.length > 1 ? 's' : ''})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sélection Variation */}
      {zoneSelectionnee && (
        <div className="space-y-2 animate-slide-in">
          <Label>Variation (Taille / Couleur) *</Label>
          <Select 
            value={variationSelectionnee} 
            onValueChange={handleVariationChange}
            disabled={disabled || variations.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une variation" />
            </SelectTrigger>
            <SelectContent>
              {variations.map(v => (
                <SelectItem key={v.attributs} value={v.attributs}>
                  {v.attributs} - Stock: {v.quantite}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {variationSelectionnee && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ Stock disponible: {getStockVariation(variationSelectionnee)} unités
            </p>
          )}
        </div>
      )}
    </div>
  );
}