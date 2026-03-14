import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Loader2, AlertCircle } from "lucide-react";
import SelecteurLocalisation from "./SelecteurLocalisation";

export default function FormulaireVente({ produits, vendeurs, livraisons, onSubmit, enCours }) {
  const [donnees, setDonnees] = useState({
    produit_id: "",
    vendeur_id: "",
    livraison_id: "",
    quantite: "",
    prix_unitaire: "",
    client_nom: "",
    client_telephone: "",
    client_adresse: "",
    notes: "",
    ville: "",
    zone: "",
    variation: "",
  });

  const [localisation, setLocalisation] = useState({
    ville: "",
    zone: "",
    variation: "",
    stockDisponible: 0
  });

  const [erreur, setErreur] = useState("");

  const produitSelectionne = useMemo(
    () => produits.find((p) => p.id === donnees.produit_id),
    [donnees.produit_id, produits]
  );

  const livraisonSelectionnee = useMemo(
    () => livraisons.find((l) => l.id === donnees.livraison_id),
    [donnees.livraison_id, livraisons]
  );

  const vendeurSelectionne = useMemo(
    () => vendeurs.find((v) => v.id === donnees.vendeur_id),
    [donnees.vendeur_id, vendeurs]
  );

  // Calculs automatiques
  const qte = parseFloat(donnees.quantite) || 0;
  const prixUnit = parseFloat(donnees.prix_unitaire) || 0;
  const montantTotal = qte * prixUnit;
  const coutLivraison = livraisonSelectionnee?.cout || 0;
  const prixGros = produitSelectionne?.prix_gros || 0;
  const prixAchat = produitSelectionne?.prix_achat || 0;
  const commission = (prixUnit - prixGros) * qte;
  const profitZonite = (prixGros - prixAchat) * qte - coutLivraison;
  const tauxCommission = 0;

  const modifier = (champ, valeur) => {
    setDonnees((prev) => ({ ...prev, [champ]: valeur }));
    setErreur("");

    // Remplir automatiquement le prix unitaire avec le prix de gros (minimum)
    if (champ === "produit_id") {
      const p = produits.find((pr) => pr.id === valeur);
      if (p) {
        setDonnees((prev) => ({ ...prev, [champ]: valeur, prix_unitaire: p.prix_gros || "" }));
      }
    }
  };

  const handleLocalisationChange = (loc) => {
    setLocalisation(loc);
    setDonnees(prev => ({
      ...prev,
      ville: loc.ville,
      zone: loc.zone,
      variation: loc.variation
    }));
    setErreur("");
  };

  const valider = () => {
    if (!donnees.produit_id) return setErreur("Sélectionnez un produit");
    if (!localisation.ville) return setErreur("Sélectionnez une ville");
    if (!localisation.zone) return setErreur("Sélectionnez une zone");
    if (!localisation.variation) return setErreur("Sélectionnez une variation (taille/couleur)");
    if (!donnees.vendeur_id) return setErreur("Sélectionnez un vendeur");
    if (!qte || qte <= 0) return setErreur("La quantité doit être positive");
    if (!prixUnit || prixUnit <= 0) return setErreur("Le prix unitaire doit être positif");
    if (produitSelectionne && prixUnit < prixGros) {
      return setErreur(`Le prix de vente (${prixUnit} FCFA) doit être ≥ au prix de gros (${prixGros} FCFA)`);
    }
    if (qte > localisation.stockDisponible) {
      return setErreur(`Stock insuffisant pour cette variation (${localisation.stockDisponible} disponibles)`);
    }
    onSubmit({
      ...donnees,
      quantite: qte,
      prix_unitaire: prixUnit,
      montantTotal,
      coutLivraison,
      commission,
      tauxCommission,
      profitZonite,
      produitSelectionne,
      vendeurSelectionne,
      livraisonSelectionnee,
      ville: localisation.ville,
      zone: localisation.zone,
      variation: localisation.variation,
    });
  };

  const formater = (n) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

  return (
    <div className="space-y-6">
      {erreur && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {erreur}
        </div>
      )}

      <div className="space-y-5">
        {/* Produit */}
        <div className="space-y-2">
          <Label>Produit *</Label>
          <Select value={donnees.produit_id} onValueChange={(v) => modifier("produit_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un produit" />
            </SelectTrigger>
            <SelectContent>
              {produits.filter(p => p.statut === "actif").map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {produitSelectionne && (
            <p className="text-xs text-slate-500">
              Prix de gros: {formater(produitSelectionne.prix_gros)}
            </p>
          )}
        </div>

        {/* Sélecteur Localisation */}
        <SelecteurLocalisation
          produit={produitSelectionne}
          value={localisation}
          onChange={handleLocalisationChange}
          disabled={enCours}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

      {/* Vendeur */}
        <div className="space-y-2">
          <Label>Vendeur *</Label>
          <Select value={donnees.vendeur_id} onValueChange={(v) => modifier("vendeur_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un vendeur" />
            </SelectTrigger>
            <SelectContent>
              {vendeurs.filter(v => v.statut === "actif").map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nom_complet}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantité */}
        <div className="space-y-2">
          <Label>Quantité *</Label>
          <Input
            type="number"
            min="1"
            value={donnees.quantite}
            onFocus={(e) => e.target.select()}
            onChange={(e) => modifier("quantite", e.target.value)}
            onBlur={(e) => { if (e.target.value === "") modifier("quantite", ""); }}
            placeholder="0"
          />
        </div>

        {/* Prix unitaire */}
        <div className="space-y-2">
          <Label>Prix de Vente (FCFA) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={donnees.prix_unitaire}
            onFocus={(e) => e.target.select()}
            onChange={(e) => modifier("prix_unitaire", e.target.value)}
            placeholder="0"
          />
          {produitSelectionne && (
            <p className="text-xs text-slate-400">
              Prix de gros (minimum) : {(produitSelectionne.prix_gros || 0).toLocaleString("fr-FR")} FCFA
            </p>
          )}
        </div>

        {/* Livraison */}
        <div className="space-y-2">
          <Label>Livraison</Label>
          <Select value={donnees.livraison_id} onValueChange={(v) => modifier("livraison_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une livraison" />
            </SelectTrigger>
            <SelectContent>
              {livraisons.filter(l => l.statut === "actif").map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nom} – {formater(l.cout)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client */}
        <div className="space-y-2">
          <Label>Nom du Client</Label>
          <Input
            value={donnees.client_nom}
            onChange={(e) => modifier("client_nom", e.target.value)}
            placeholder="Nom du client"
          />
        </div>
        <div className="space-y-2">
          <Label>Téléphone Client</Label>
          <Input
            value={donnees.client_telephone}
            onChange={(e) => modifier("client_telephone", e.target.value)}
            placeholder="Numéro de téléphone"
          />
        </div>
        <div className="space-y-2">
          <Label>Adresse de Livraison</Label>
          <Input
            value={donnees.client_adresse}
            onChange={(e) => modifier("client_adresse", e.target.value)}
            placeholder="Adresse complète"
          />
        </div>
        </div>

          {/* Notes */}
        <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={donnees.notes}
          onChange={(e) => modifier("notes", e.target.value)}
          placeholder="Notes supplémentaires..."
          rows={2}
        />
        </div>

          {/* Récapitulatif financier */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Récapitulatif Financier</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Montant Total</p>
            <p className="font-bold text-lg text-slate-900">{formater(montantTotal)}</p>
          </div>
          <div>
            <p className="text-slate-500">Coût Livraison</p>
            <p className="font-bold text-lg text-slate-900">{formater(coutLivraison)}</p>
          </div>
          <div>
            <p className="text-slate-500">Commission Vendeur</p>
            <p className="font-bold text-lg text-yellow-600">{formater(commission)}</p>
          </div>
          <div>
            <p className="text-slate-500">Profit ZONITE</p>
            <p className={`font-bold text-lg ${profitZonite >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formater(profitZonite)}
            </p>
          </div>
        </div>
        </div>

          {/* Bouton validation */}
        <Button
        onClick={valider}
        disabled={enCours}
        className="w-full h-12 text-base bg-[#1a1f5e] hover:bg-[#141952] text-white"
      >
        {enCours ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Enregistrement...
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5 mr-2" />
            Enregistrer la Vente
          </>
        )}
        </Button>
      </div>
    </div>
  );
}