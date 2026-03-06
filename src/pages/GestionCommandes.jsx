import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUTS = {
  en_attente_validation_admin: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  validee_admin: { label: "Validée", color: "bg-blue-100 text-blue-700" },
  attribuee_livreur: { label: "Attribuée", color: "bg-purple-100 text-purple-700" },
  en_livraison: { label: "En livraison", color: "bg-orange-100 text-orange-700" },
  livree: { label: "Livrée", color: "bg-emerald-100 text-emerald-700" },
  echec_livraison: { label: "Échec", color: "bg-red-100 text-red-700" },
  annulee: { label: "Annulée", color: "bg-slate-100 text-slate-700" },
};

export default function GestionCommandes() {
  const [filtreStatut, setFiltreStatut] = useState("all");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null);
  const [livreurSelectionne, setLivreurSelectionne] = useState("");
  const [nouveauStatut, setNouveauStatut] = useState("");
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  // Récupérer les commandes
  const { data: commandes = [], isLoading: loadingCommandes } = useQuery({
    queryKey: ["commandes"],
    queryFn: () => base44.entities.CommandeVendeur.list("-created_date"),
  });

  // Récupérer les livreurs actifs
  const { data: livreurs = [] } = useQuery({
    queryKey: ["livreurs"],
    queryFn: () => base44.entities.Livraison.filter({ statut: "actif" }),
  });

  // Filtrer les commandes
  const commandesFiltrees = filtreStatut === "all"
    ? commandes
    : commandes.filter(c => c.statut === filtreStatut);

  const ouvrir = (cmd) => {
    setCommandeSelectionnee(cmd);
    setLivreurSelectionne(cmd.livreur_id || "");
    setNouveauStatut(cmd.statut);
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    if (!commandeSelectionnee) return;
    setEnCours(true);

    try {
      const updateData = {
        statut: nouveauStatut,
        ...(livreurSelectionne && { livreur_id: livreurSelectionne }),
      };

      if (livreurSelectionne) {
        const livreur = livreurs.find(l => l.id === livreurSelectionne);
        if (livreur) {
          updateData.livreur_nom = livreur.nom;
        }
      }

      await adminApi.updateCommandeVendeur(commandeSelectionnee.id, updateData);

      // Créer une notification pour le vendeur
      const statusLabels = {
        validee_admin: "✅ Validée par l'admin",
        attribuee_livreur: "🚚 Assignée au livreur",
        en_livraison: "📦 En cours de livraison",
        livree: "🎉 Livrée avec succès",
        echec_livraison: "❌ Livraison échouée",
        annulee: "🚫 Annulée",
      };

      await adminApi.createNotificationVendeur({
        vendeur_email: commandeSelectionnee.vendeur_email,
        titre: "📦 Mise à jour commande",
        message: `${commandeSelectionnee.produit_nom} - Statut: ${statusLabels[nouveauStatut] || nouveauStatut}`,
        type: nouveauStatut === "livree" ? "succes" : nouveauStatut === "echec_livraison" ? "alerte" : "info",
        lien: `/MesCommandesVendeur?cmd_id=${commandeSelectionnee.id}`,
        lue: false,
      });

      // Journal d'audit
      await adminApi.createJournalAudit({
        action: "Statut commande modifié",
        module: "commande",
        details: `Commande ${commandeSelectionnee.id} - Nouveau statut: ${nouveauStatut}${livreurSelectionne ? ` - Livreur assigné: ${updateData.livreur_nom}` : ""}`,
        entite_id: commandeSelectionnee.id,
      });

      queryClient.invalidateQueries({ queryKey: ["commandes"] });
      setDialogOuvert(false);
      setEnCours(false);
    } catch (error) {
      alert("Erreur: " + error.message);
      setEnCours(false);
    }
  };

  if (loadingCommandes) {
    return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtre */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUTS).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des commandes */}
      <div className="space-y-3">
        {commandesFiltrees.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>Aucune commande dans ce statut</p>
          </div>
        ) : (
          commandesFiltrees.map((cmd) => (
            <div key={cmd.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Infos commande */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{cmd.produit_nom}</h3>
                    <Badge className={STATUTS[cmd.statut]?.color}>{STATUTS[cmd.statut]?.label}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p><strong>Vendeur:</strong> {cmd.vendeur_nom} ({cmd.vendeur_email})</p>
                    <p><strong>Client:</strong> {cmd.client_nom} - {cmd.client_telephone}</p>
                    <p><strong>Quantité:</strong> {cmd.quantite} × {cmd.prix_final_client} FCFA = {cmd.quantite * cmd.prix_final_client} FCFA</p>
                    {cmd.livreur_nom && <p><strong>Livreur:</strong> {cmd.livreur_nom}</p>}
                  </div>
                </div>

                {/* Actions */}
                <Button onClick={() => ouvrir(cmd)} className="bg-[#1a1f5e] hover:bg-[#141952] w-full sm:w-auto">
                  {cmd.livreur_id ? "Modifier" : "Assigner"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog d'attribution */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gérer la commande</DialogTitle>
          </DialogHeader>

          {commandeSelectionnee && (
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">
                  <strong>{commandeSelectionnee.produit_nom}</strong> - {commandeSelectionnee.quantite} unités
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Vendeur: {commandeSelectionnee.vendeur_nom}
                </p>
              </div>

              {/* Assigner livreur */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Assigner un livreur</label>
                <Select value={livreurSelectionne} onValueChange={setLivreurSelectionne}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un livreur" />
                  </SelectTrigger>
                  <SelectContent>
                    {livreurs.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Changer statut */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Statut</label>
                <Select value={nouveauStatut} onValueChange={setNouveauStatut}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUTS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}