import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FormulaireVente from "@/components/vente/FormulaireVente";

export default function NouvelleVente() {
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const queryClient = useQueryClient();

  const { data: produits = [] } = useQuery({
    queryKey: ["produits"],
    queryFn: () => base44.entities.Produit.list(),
  });

  const { data: vendeurs = [] } = useQuery({
    queryKey: ["vendeurs"],
    queryFn: () => base44.entities.Vendeur.list(),
  });

  const { data: livraisons = [] } = useQuery({
    queryKey: ["livraisons"],
    queryFn: () => base44.entities.Livraison.list(),
  });

  const enregistrerVente = async (donnees) => {
    setEnCours(true);

    const dateVente = new Date().toISOString();
    const produit = donnees.produitSelectionne;
    const vendeur = donnees.vendeurSelectionne;
    const livraison = donnees.livraisonSelectionnee;

    // 1. Créer la vente
    await base44.entities.Vente.create({
      produit_id: donnees.produit_id,
      produit_nom: produit.nom,
      vendeur_id: donnees.vendeur_id,
      vendeur_nom: vendeur.nom_complet,
      livraison_id: donnees.livraison_id || "",
      livraison_nom: livraison?.nom || "",
      quantite: donnees.quantite,
      prix_unitaire: donnees.prix_unitaire,
      prix_achat_unitaire: produit.prix_achat,
      montant_total: donnees.montantTotal,
      cout_livraison: donnees.coutLivraison,
      commission_vendeur: donnees.commission,
      taux_commission: donnees.tauxCommission,
      profit_zonite: donnees.profitZonite,
      date_vente: dateVente,
      statut_commande: "en_attente",
      client_nom: donnees.client_nom,
      client_telephone: donnees.client_telephone,
      client_adresse: donnees.client_adresse,
      notes: donnees.notes,
    });

    // 2. Diminuer le stock global
    const ancienStock = produit.stock_global || 0;
    const nouveauStock = ancienStock - donnees.quantite;
    await base44.entities.Produit.update(produit.id, {
      stock_global: nouveauStock,
      total_vendu: (produit.total_vendu || 0) + donnees.quantite,
      statut: nouveauStock <= 0 ? "rupture" : "actif",
    });

    // 3. Mouvement stock
    await base44.entities.MouvementStock.create({
      produit_id: produit.id,
      produit_nom: produit.nom,
      type_mouvement: "sortie",
      quantite: donnees.quantite,
      stock_avant: ancienStock,
      stock_apres: nouveauStock,
      raison: "Vente enregistrée",
    });

    // 4. Mettre à jour le vendeur
    await base44.entities.Vendeur.update(vendeur.id, {
      solde_commission: (vendeur.solde_commission || 0) + donnees.commission,
      total_commissions_gagnees: (vendeur.total_commissions_gagnees || 0) + donnees.commission,
      nombre_ventes: (vendeur.nombre_ventes || 0) + 1,
      chiffre_affaires_genere: (vendeur.chiffre_affaires_genere || 0) + donnees.montantTotal,
    });

    // 5. Journal d'audit
    await base44.entities.JournalAudit.create({
      action: "Nouvelle vente enregistrée",
      module: "vente",
      details: `Vente de ${donnees.quantite}x ${produit.nom} par ${vendeur.nom_complet} – Total: ${donnees.montantTotal} DA`,
      entite_id: donnees.produit_id,
    });

    // Invalider les caches
    queryClient.invalidateQueries({ queryKey: ["produits"] });
    queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
    queryClient.invalidateQueries({ queryKey: ["ventes"] });

    setEnCours(false);
    setSucces(true);
  };

  if (succes) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 animate-slide-in">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Vente Enregistrée !</h2>
        <p className="text-slate-500 mb-6">
          La vente a été enregistrée avec succès. Le stock, les commissions et les statistiques ont été mis à jour automatiquement.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => setSucces(false)} className="bg-[#1a1f5e] hover:bg-[#141952]">
            Nouvelle Vente
          </Button>
          <Link to={createPageUrl("TableauDeBord")}>
            <Button variant="outline">Tableau de Bord</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Enregistrer une Vente</h2>
        <p className="text-sm text-slate-500 mb-6">
          Remplissez les informations ci-dessous. Le stock, les commissions et les statistiques seront mis à jour automatiquement.
        </p>
        <FormulaireVente
          produits={produits}
          vendeurs={vendeurs}
          livraisons={livraisons}
          onSubmit={enregistrerVente}
          enCours={enCours}
        />
      </div>
    </div>
  );
}