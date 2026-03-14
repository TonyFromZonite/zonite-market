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
    prix_livraison: "",
    mode_paiement: "paiement_livraison",
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
  const prixLivraison = parseFloat(donnees.prix_livraison) || 0;
  const montantTotal = qte * prixUnit;
  const prixGros = produitSelectionne?.prix_gros || 0;
  const prixAchat = produitSelectionne?.prix_achat || 0;
  const commission = (prixUnit - prixGros) * qte;
  const profitZonite = (prixGros - prixAchat) * qte - prixLivraison;
  const tauxCommission = vendeurSelectionne?.taux_commission || 0;

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
      variation: loc.variation,
      prix_livraison: loc.prixLivraison || prev.prix_livraison
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
      prix_livraison: prixLivraison,
      montantTotal,
      coutLivraison: prixLivraison,
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
          livraisons={livraisons}
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

          {/* Prix Livraison */}
          <div className="space-y-2">
            <Label>Prix Livraison (FCFA) *</Label>
            <Input
              type="number"
              min="0"
              step="100"
              value={donnees.prix_livraison}
              onChange={(e) => modifier("prix_livraison", e.target.value)}
              placeholder="0"
            />
            {localisation.zone && (
              <p className="text-xs text-blue-600">
                ✓ Prix auto-rempli pour {localisation.ville} - {localisation.zone}
              </p>
            )}
          </div>

          {/* Mode de Paiement */}
          <div className="space-y-2">
            <Label>Mode de Paiement *</Label>
            <Select value={donnees.mode_paiement} onValueChange={(v) => modifier("mode_paiement", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paiement_livraison">Paiement à la livraison</SelectItem>
                <SelectItem value="paiement_avance">Paiement avant livraison</SelectItem>
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

        {/* Récapitulatif Commande */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">📋 Récapitulatif de la Commande</h3>
          
          {/* Détails Produit */}
          <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Produit:</span>
              <span className="font-semibold text-slate-900">{produitSelectionne?.nom || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Variation:</span>
              <span className="font-semibold text-slate-900">{localisation.variation || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Localisation:</span>
              <span className="font-semibold text-slate-900">
                {localisation.ville && localisation.zone ? `${localisation.ville} - ${localisation.zone}` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Quantité:</span>
              <span className="font-semibold text-slate-900">{qte || 0}</span>
            </div>
          </div>

          {/* Calculs Financiers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Prix de Vente</p>
              <p className="font-bold text-lg text-slate-900">{formater(prixUnit)}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Livraison</p>
              <p className="font-bold text-lg text-slate-900">{formater(prixLivraison)}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Montant Total</p>
              <p className="font-bold text-lg text-blue-600">{formater(montantTotal)}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Mode Paiement</p>
              <p className="font-semibold text-xs text-slate-700">
                {donnees.mode_paiement === "paiement_livraison" ? "À la livraison" : "Avant livraison"}
              </p>
            </div>
          </div>

          {/* Commissions */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700 mb-1">Commission Vendeur</p>
              <p className="font-bold text-lg text-yellow-600">{formater(commission)}</p>
            </div>
            <div className={`${profitZonite >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-lg p-3`}>
              <p className={`text-xs mb-1 ${profitZonite >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Profit ZONITE</p>
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