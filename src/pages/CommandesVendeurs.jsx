import React, { useState, useEffect } from "react";
import { requireAdminOrSousAdmin } from "@/components/useSessionGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateQuery } from "@/components/CacheManager";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, CheckCircle2, Truck, XCircle, PackageCheck, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUTS = {
  en_attente_validation_admin: { label: "En attente validation", couleur: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  validee_admin:               { label: "Validée", couleur: "bg-blue-100 text-blue-800 border-blue-200" },
  attribuee_livreur:           { label: "Attribuée livreur", couleur: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  en_livraison:                { label: "En livraison", couleur: "bg-purple-100 text-purple-800 border-purple-200" },
  livree:                      { label: "Livrée ✓", couleur: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  echec_livraison:             { label: "Échec livraison", couleur: "bg-orange-100 text-orange-800 border-orange-200" },
  annulee:                     { label: "Annulée", couleur: "bg-red-100 text-red-800 border-red-200" },
};

export default function CommandesVendeurs() {
  useEffect(() => { requireAdminOrSousAdmin(); }, []);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null);
  const [notesAdmin, setNotesAdmin] = useState("");
  const [livreurNom, setLivreurNom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [modalRetour, setModalRetour] = useState(false);
  const [retourForm, setRetourForm] = useState({ raison: "client_refuse", raison_detail: "", quantite: 1 });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: commandes = [], isLoading } = useQuery({
    queryKey: ["commandes_vendeurs_admin"],
    queryFn: () => base44.entities.CommandeVendeur.list("-created_date", 200),
  });

  const { data: livreurs = [] } = useQuery({
    queryKey: ["livreurs_actifs"],
    queryFn: () => base44.entities.Livraison.filter({ statut: "actif" }),
  });

  const nbEnAttente = commandes.filter(c => c.statut === "en_attente_validation_admin").length;

  const validerCommande = async () => {
    setEnCours(true);
    await adminApi.updateCommandeVendeur(commandeSelectionnee.id, {
      statut: "validee_admin",
      notes_admin: notesAdmin || commandeSelectionnee.notes_admin,
    });
    await adminApi.createNotificationVendeur({
      vendeur_email: commandeSelectionnee.vendeur_email,
      titre: "Commande validée ✓",
      message: `Votre commande de ${commandeSelectionnee.quantite}x ${commandeSelectionnee.produit_nom} pour ${commandeSelectionnee.client_nom} a été validée par l'équipe ZONITE.`,
      type: "succes",
    });
    await adminApi.createJournalAudit({
      action: "Validation commande vendeur",
      module: "commande",
      details: `Commande ${commandeSelectionnee.id} validée — Vendeur: ${commandeSelectionnee.vendeur_nom}`,
      entite_id: commandeSelectionnee.id,
    });
    queryClient.invalidateQueries({ queryKey: ["commandes_vendeurs_admin"] });
    setEnCours(false);
    setCommandeSelectionnee(null);
  };

  const attribuerLivreur = async () => {
    if (!livreurNom.trim()) return;
    setEnCours(true);
    await adminApi.updateCommandeVendeur(commandeSelectionnee.id, {
      statut: "attribuee_livreur",
      livreur_nom: livreurNom,
      notes_admin: notesAdmin || commandeSelectionnee.notes_admin,
    });
    await adminApi.createNotificationVendeur({
      vendeur_email: commandeSelectionnee.vendeur_email,
      titre: "Livreur attribué",
      message: `Un livreur (${livreurNom}) a été attribué à votre commande pour ${commandeSelectionnee.client_nom}.`,
      type: "info",
    });
    await adminApi.createJournalAudit({
      action: "Attribution livreur",
      module: "commande",
      details: `Livreur "${livreurNom}" attribué à la commande ${commandeSelectionnee.id}`,
      entite_id: commandeSelectionnee.id,
    });
    queryClient.invalidateQueries({ queryKey: ["commandes_vendeurs_admin"] });
    setEnCours(false);
    setCommandeSelectionnee(null);
  };

  const marquerEnLivraison = async () => {
    setEnCours(true);
    await adminApi.updateCommandeVendeur(commandeSelectionnee.id, { statut: "en_livraison" });
    await adminApi.createNotificationVendeur({
      vendeur_email: commandeSelectionnee.vendeur_email,
      titre: "Commande en livraison 🚚",
      message: `La commande de ${commandeSelectionnee.produit_nom} pour ${commandeSelectionnee.client_nom} est en cours de livraison.`,
      type: "info",
    });
    queryClient.invalidateQueries({ queryKey: ["commandes_vendeurs_admin"] });
    setEnCours(false);
    setCommandeSelectionnee(null);
  };

  const marquerLivree = async () => {
    setEnCours(true);
    const produits = await base44.entities.Produit.list();
    const produit = produits.find(p => p.id === commandeSelectionnee.produit_id);
    if (produit) {
      await adminApi.updateProduit(produit.id, {
        stock_reserve: Math.max(0, (produit.stock_reserve || 0) - commandeSelectionnee.quantite),
        total_vendu: (produit.total_vendu || 0) + commandeSelectionnee.quantite,
      });
    }

    const sellers = await base44.entities.Seller.filter({ id: commandeSelectionnee.vendeur_id });
    if (sellers.length > 0) {
      const seller = sellers[0];
      await base44.asServiceRole.entities.Seller.update(seller.id, {
        solde_commission: (seller.solde_commission || 0) + (commandeSelectionnee.commission_vendeur || 0),
        total_commissions_gagnees: (seller.total_commissions_gagnees || 0) + (commandeSelectionnee.commission_vendeur || 0),
        ventes_reussies: (seller.ventes_reussies || 0) + 1,
      });
    }

    await adminApi.updateCommandeVendeur(commandeSelectionnee.id, { statut: "livree", notes_admin: notesAdmin || commandeSelectionnee.notes_admin });
    await adminApi.createNotificationVendeur({
      vendeur_email: commandeSelectionnee.vendeur_email,
      titre: "Commande livrée ✓",
      message: `La commande de ${commandeSelectionnee.produit_nom} a été livrée à ${commandeSelectionnee.client_nom}. Commission de ${Math.round(commandeSelectionnee.commission_vendeur || 0).toLocaleString("fr-FR")} FCFA créditée.`,
      type: "succes",
    });
    await adminApi.createJournalAudit({
      action: "Livraison confirmée",
      module: "commande",
      details: `Commande ${commandeSelectionnee.id} livrée — Commission: ${commandeSelectionnee.commission_vendeur} FCFA`,
      entite_id: commandeSelectionnee.id,
    });
    invalidateQuery('PRODUITS');
    queryClient.invalidateQueries({ queryKey: ["commandes_vendeurs_admin"] });
    setEnCours(false);
    setCommandeSelectionnee(null);
  };

  const marquerEchec = async () => {
    setEnCours(true);
    const produits = await base44.entities.Produit.list();
    const produit = produits.find(p => p.id === commandeSelectionnee.produit_id);
    if (produit) {
      await adminApi.updateProduit(produit.id, {
        stock_global: (produit.stock_global || 0) + commandeSelectionnee.quantite,
        stock_reserve: Math.max(0, (produit.stock_reserve || 0) - commandeSelectionnee.quantite),
      });
      await adminApi.createMouvementStock({
        produit_id: produit.id,
        produit_nom: produit.nom,
        type_mouvement: "entree",
        quantite: commandeSelectionnee.quantite,
        stock_avant: produit.stock_global || 0,
        stock_apres: (produit.stock_global || 0) + commandeSelectionnee.quantite,
        raison: `Échec livraison — commande ${commandeSelectionnee.id}`,
      });
    }
    const sellersEchec = await base44.entities.Seller.filter({ id: commandeSelectionnee.vendeur_id });
    if (sellersEchec.length > 0) {
      const sellerEchec = sellersEchec[0];
      await base44.asServiceRole.entities.Seller.update(sellerEchec.id, {
        ventes_echouees: (sellerEchec.ventes_echouees || 0) + 1,
      });
    }
    await adminApi.updateCommandeVendeur(commandeSelectionnee.id, { statut: "echec_livraison", notes_admin: notesAdmin || commandeSelectionnee.notes_admin });
    await adminApi.createNotificationVendeur({
      vendeur_email: commandeSelectionnee.vendeur_email,
      titre: "Échec de livraison",
      message: `La livraison de ${commandeSelectionnee.produit_nom} pour ${commandeSelectionnee.client_nom} a échoué. Le stock a été restitué.`,
      type: "alerte",
    });
    invalidateQuery('PRODUITS');
    queryClient.invalidateQueries({ queryKey: ["commandes_vendeurs_admin"] });
    setEnCours(false);
    setCommandeSelectionnee(null);
  };

  const enregistrerRetour = async () => {
    setEnCours(true);
    await adminApi.createRetourProduit({
      commande_id: commandeSelectionnee.id,
      vendeur_id: commandeSelectionnee.vendeur_id,
      vendeur_nom: commandeSelectionnee.vendeur_nom,
      vendeur_email: commandeSelectionnee.vendeur_email,
      produit_id: commandeSelectionnee.produit_id,
      produit_nom: commandeSelectionnee.produit_nom,
      quantite_retournee: parseInt(retourForm.quantite) || 1,
      raison: retourForm.raison,
      raison_detail: retourForm.raison_detail,
      statut: "en_attente",
    });
    await adminApi.createNotificationVendeur({
      vendeur_email: commandeSelectionnee.vendeur_email,
      titre: "Retour enregistré",
      message: `Un retour de ${retourForm.quantite}x ${commandeSelectionnee.produit_nom} a été enregistré et est en cours de traitement.`,
      type: "alerte",
    });
    await adminApi.createJournalAudit({
      action: "Retour produit enregistré",
      module: "commande",
      details: `Retour de ${retourForm.quantite}x ${commandeSelectionnee.produit_nom} — Raison: ${retourForm.raison}`,
      entite_id: commandeSelectionnee.id,
    });
    setModalRetour(false);
    setEnCours(false);
    setCommandeSelectionnee(null);
    navigate(createPageUrl("RetoursAdmin"));
  };

  const annulerCommande = async () => {
    setEnCours(true);
    // Restituer le stock si la commande était encore en cours (pas livrée)
    const statutsAvecStockReserve = ["en_attente_validation_admin", "validee_admin", "attribuee_livreur", "en_livraison"];
    if (statutsAvecStockReserve.includes(commandeSelectionnee.statut)) {
      const produits = await base44.entities.Produit.list();
      const produit = produits.find(p => p.id === commandeSelectionnee.produit_id);
      if (produit) {
        await adminApi.updateProduit(produit.id, {
          stock_global: (produit.stock_global || 0) + commandeSelectionnee.quantite,
          stock_reserve: Math.max(0, (produit.stock_reserve || 0) - commandeSelectionnee.quantite),
        });
      }
    }
    await adminApi.updateCommandeVendeur(commandeSelectionnee.id, { statut: "annulee", notes_admin: notesAdmin || commandeSelectionnee.notes_admin });
    await adminApi.createNotificationVendeur({
      vendeur_email: commandeSelectionnee.vendeur_email,
      titre: "Commande annulée",
      message: `Votre commande de ${commandeSelectionnee.produit_nom} pour ${commandeSelectionnee.client_nom} a été annulée.`,
      type: "alerte",
    });
    await adminApi.createJournalAudit({ action: "Commande annulée", module: "commande", details: `Commande ${commandeSelectionnee.id} annulée`, entite_id: commandeSelectionnee.id });
    invalidateQuery('PRODUITS');
    queryClient.invalidateQueries({ queryKey: ["commandes_vendeurs_admin"] });
    setEnCours(false);
    setCommandeSelectionnee(null);
  };

  const commandesFiltrees = commandes.filter(c => {
    const texte = `${c.produit_nom} ${c.vendeur_nom} ${c.client_nom} ${c.client_ville}`.toLowerCase();
    return (filtreStatut === "tous" || c.statut === filtreStatut) && (!recherche || texte.includes(recherche.toLowerCase()));
  });

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";

  if (isLoading) return <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      {nbEnAttente > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">{nbEnAttente}</span>
          <p className="text-sm text-yellow-800 font-medium">{nbEnAttente} commande{nbEnAttente > 1 ? "s" : ""} en attente de validation</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtreStatut} onValueChange={v => setFiltreStatut(v)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {commandesFiltrees.length === 0 && (
          <div className="p-8 text-center text-slate-400">Aucune commande</div>
        )}
        {commandesFiltrees.map(c => (
          <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => { setCommandeSelectionnee(c); setNotesAdmin(c.notes_admin || ""); setLivreurNom(c.livreur_nom || ""); }}>
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-medium text-sm text-slate-900 truncate">{c.produit_nom} <span className="text-slate-400 font-normal">× {c.quantite}</span></p>
              <p className="text-xs text-slate-500">{c.vendeur_nom} → {c.client_nom} ({c.client_ville})</p>
              <p className="text-xs text-slate-400">{formaterDate(c.created_date)} • Commission: {formater(c.commission_vendeur)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${STATUTS[c.statut]?.couleur} border text-xs whitespace-nowrap`}>{STATUTS[c.statut]?.label}</Badge>
              <Eye className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!commandeSelectionnee} onOpenChange={() => setCommandeSelectionnee(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Commande : {commandeSelectionnee?.produit_nom}</DialogTitle>
          </DialogHeader>
          {commandeSelectionnee && (
            <div className="space-y-4 text-sm">
              <Badge className={`${STATUTS[commandeSelectionnee.statut]?.couleur} border`}>{STATUTS[commandeSelectionnee.statut]?.label}</Badge>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
                <div><p className="text-slate-400 text-xs">Vendeur</p><p className="font-medium">{commandeSelectionnee.vendeur_nom}</p></div>
                <div><p className="text-slate-400 text-xs">Quantité</p><p className="font-medium">{commandeSelectionnee.quantite}</p></div>
                <div><p className="text-slate-400 text-xs">Prix client</p><p className="font-bold">{formater(commandeSelectionnee.prix_final_client)}</p></div>
                <div><p className="text-slate-400 text-xs">Commission vendeur</p><p className="font-bold text-yellow-600">{formater(commandeSelectionnee.commission_vendeur)}</p></div>
                <div><p className="text-slate-400 text-xs">Client</p><p className="font-medium">{commandeSelectionnee.client_nom}</p></div>
                <div><p className="text-slate-400 text-xs">Téléphone</p><p className="font-medium">{commandeSelectionnee.client_telephone}</p></div>
                <div className="col-span-2"><p className="text-slate-400 text-xs">Adresse</p><p className="font-medium">{commandeSelectionnee.client_ville}{commandeSelectionnee.client_quartier ? `, ${commandeSelectionnee.client_quartier}` : ""}{commandeSelectionnee.client_adresse ? ` – ${commandeSelectionnee.client_adresse}` : ""}</p></div>
                {commandeSelectionnee.livreur_nom && <div className="col-span-2"><p className="text-slate-400 text-xs">Livreur</p><p className="font-medium">{commandeSelectionnee.livreur_nom}</p></div>}
                {commandeSelectionnee.notes && <div className="col-span-2"><p className="text-slate-400 text-xs">Notes vendeur</p><p>{commandeSelectionnee.notes}</p></div>}
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 text-xs font-medium">Note admin (visible par le vendeur)</label>
                <Textarea value={notesAdmin} onChange={e => setNotesAdmin(e.target.value)} placeholder="Message au vendeur..." rows={2} />
              </div>

              {/* Actions selon statut */}
              <div className="space-y-2">
                {commandeSelectionnee.statut === "en_attente_validation_admin" && (
                  <Button onClick={validerCommande} disabled={enCours} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Valider la commande
                  </Button>
                )}
                {(commandeSelectionnee.statut === "validee_admin") && (
                  <div className="space-y-2">
                    {/* Livreurs suggérés selon la ville du client */}
                    {(() => {
                      const villeClient = (commandeSelectionnee.client_ville || "").toLowerCase().trim();
                      const livreursVille = livreurs.filter(l =>
                        l.zones_couvertes?.some(z => z.ville?.toLowerCase().trim() === villeClient)
                      );
                      return livreursVille.length > 0 ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-semibold text-emerald-700">Livreurs disponibles à {commandeSelectionnee.client_ville} :</p>
                          {livreursVille.map(l => (
                            <button key={l.id} onClick={() => setLivreurNom(l.nom)} className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${livreurNom === l.nom ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-emerald-200 hover:bg-emerald-100 text-slate-800"}`}>
                              <span className="font-medium">{l.nom}</span>
                              {l.vehicule && <span className="ml-2 text-xs opacity-70">· {l.vehicule}</span>}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-xl p-2">Aucun livreur enregistré pour <strong>{commandeSelectionnee.client_ville}</strong></p>
                      );
                    })()}
                    <div className="space-y-1">
                      <label className="text-slate-500 text-xs font-medium">Ou saisir manuellement *</label>
                      <Input value={livreurNom} onChange={e => setLivreurNom(e.target.value)} placeholder="Nom du livreur..." />
                    </div>
                    <Button onClick={attribuerLivreur} disabled={enCours || !livreurNom.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                      <Truck className="w-4 h-4" /> Attribuer le livreur
                    </Button>
                  </div>
                )}
                {commandeSelectionnee.statut === "attribuee_livreur" && (
                  <Button onClick={marquerEnLivraison} disabled={enCours} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
                    <Truck className="w-4 h-4" /> Marquer en livraison
                  </Button>
                )}
                {commandeSelectionnee.statut === "en_livraison" && (
                  <Button onClick={marquerLivree} disabled={enCours} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <PackageCheck className="w-4 h-4" /> Confirmer livraison
                  </Button>
                )}
                {commandeSelectionnee.statut === "livree" && (
                  <Button onClick={() => { setRetourForm({ raison: "client_refuse", raison_detail: "", quantite: commandeSelectionnee.quantite }); setModalRetour(true); }} variant="outline" className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 gap-2">
                    <RotateCcw className="w-4 h-4" /> Enregistrer un retour
                  </Button>
                )}
                {!["livree", "echec_livraison", "annulee"].includes(commandeSelectionnee.statut) && (
                  <div className="flex gap-2">
                    {["en_livraison", "attribuee_livreur", "validee_admin"].includes(commandeSelectionnee.statut) && (
                      <Button onClick={marquerEchec} disabled={enCours} variant="outline" className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 gap-2">
                        <XCircle className="w-4 h-4" /> Échec livraison
                      </Button>
                    )}
                    <Button onClick={annulerCommande} disabled={enCours} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2">
                      <XCircle className="w-4 h-4" /> Annuler
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal Retour */}
      <Dialog open={modalRetour} onOpenChange={setModalRetour}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-orange-500" /> Enregistrer un retour
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-slate-500">Commande : <span className="font-medium text-slate-800">{commandeSelectionnee?.produit_nom} × {commandeSelectionnee?.quantite}</span></p>
          <div className="space-y-1">
            <label className="text-slate-500 text-xs font-medium">Quantité retournée *</label>
            <Input type="number" min="1" max={commandeSelectionnee?.quantite} value={retourForm.quantite}
              onChange={e => setRetourForm(f => ({ ...f, quantite: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 text-xs font-medium">Raison *</label>
            <Select value={retourForm.raison} onValueChange={v => setRetourForm(f => ({ ...f, raison: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="defaut_produit">Défaut produit</SelectItem>
                <SelectItem value="mauvaise_livraison">Mauvaise livraison</SelectItem>
                <SelectItem value="client_refuse">Client a refusé</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 text-xs font-medium">Détail (optionnel)</label>
            <Textarea value={retourForm.raison_detail} onChange={e => setRetourForm(f => ({ ...f, raison_detail: e.target.value }))} rows={2} placeholder="Précisions..." />
          </div>
          <Button onClick={enregistrerRetour} disabled={enCours} className="w-full bg-orange-500 hover:bg-orange-600 gap-2">
            {enCours ? <RotateCcw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Confirmer le retour
          </Button>
        </div>
      </DialogContent>
      </Dialog>
    </div>
  );
}