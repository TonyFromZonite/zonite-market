import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, ChevronLeft, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NouvelleCommandeVendeur() {
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [form, setForm] = useState({
    produit_id: "", quantite: 1, prix_final_client: "",
    livraison_incluse: false,
    client_nom: "", client_telephone: "", client_ville: "", client_quartier: "", client_adresse: "",
    notes: "",
  });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const charger = async () => {
      let emailVendeur = null;
      
      // Récupérer email depuis session vendeur (priorité)
      try {
        const session = sessionStorage.getItem("vendeur_session");
        if (session) {
          const parsed = JSON.parse(session);
          emailVendeur = parsed.email;
        }
      } catch (_) {}

      if (!emailVendeur) {
        // Fallback Base44 auth
        const u = await base44.auth.me().catch(() => null);
        if (u?.email) emailVendeur = u.email;
      }

      if (!emailVendeur) {
        window.location.href = createPageUrl("Connexion");
        return;
      }

      const comptes = await base44.entities.CompteVendeur.filter({ user_email: emailVendeur });
      if (comptes.length > 0) setCompteVendeur(comptes[0]);
      else {
        setErreur("Compte vendeur introuvable");
      }

      // Pré-remplir produit depuis URL
      const params = new URLSearchParams(window.location.search);
      const produitId = params.get("produit_id");
      if (produitId) setForm(f => ({ ...f, produit_id: produitId }));
    };
    charger();
  }, []);

  const { data: produits = [] } = useQuery({
    queryKey: ["produits_actifs"],
    queryFn: () => base44.entities.Produit.filter({ statut: "actif" }),
  });

  const modifier = (champ, val) => {
    setForm(p => ({ ...p, [champ]: val }));
    setErreur("");
  };

  const produitSelectionne = produits.find(p => p.id === form.produit_id);
  const qte = parseInt(form.quantite) || 1;
  const prixGros = produitSelectionne?.prix_gros || 0;
  const prixFinal = parseFloat(form.prix_final_client) || 0;
  const commission = Math.max(0, (prixFinal - prixGros) * qte);
  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
  // Stock disponible = stock_global (le stock_reserve est déjà déduit lors des réservations précédentes)
  const stockDisponible = produitSelectionne ? (produitSelectionne.stock_global || 0) : 0;

  const soumettre = async () => {
    if (!compteVendeur) return setErreur("Compte vendeur non chargé.");
    if (!form.produit_id) return setErreur("Sélectionnez un produit.");
    if (qte < 1) return setErreur("La quantité doit être au moins 1.");
    if (qte > stockDisponible) return setErreur(`Stock insuffisant. Stock disponible : ${stockDisponible} unité(s).`);
    if (!prixFinal || prixFinal < prixGros) return setErreur(`Le prix final doit être ≥ ${formater(prixGros)} (prix de gros).`);
    if (!form.client_nom || !form.client_telephone || !form.client_ville) return setErreur("Renseignez les informations du client.");

    setEnCours(true);
    setErreur("");

    try {
      // Créer la commande avec le nouveau statut
      await base44.entities.CommandeVendeur.create({
      vendeur_id: compteVendeur.id,
      vendeur_nom: compteVendeur.nom_complet,
      vendeur_email: compteVendeur.user_email,
      produit_id: form.produit_id,
      produit_nom: produitSelectionne.nom,
      quantite: qte,
      prix_gros: prixGros,
      prix_final_client: prixFinal,
      commission_vendeur: commission,
      livraison_incluse: form.livraison_incluse,
      client_nom: form.client_nom,
      client_telephone: form.client_telephone,
      client_ville: form.client_ville,
      client_quartier: form.client_quartier,
      client_adresse: form.client_adresse,
      notes: form.notes,
      statut: "en_attente_validation_admin",
    });

    // Réserver le stock (déduire du stock_global, ajouter au stock_reserve)
    await base44.entities.Produit.update(form.produit_id, {
      stock_global: Math.max(0, (produitSelectionne.stock_global || 0) - qte),
      stock_reserve: (produitSelectionne.stock_reserve || 0) + qte,
    });

    // Enregistrer mouvement de stock
    await base44.entities.MouvementStock.create({
      produit_id: form.produit_id,
      produit_nom: produitSelectionne.nom,
      type_mouvement: "sortie",
      quantite: qte,
      stock_avant: produitSelectionne.stock_global || 0,
      stock_apres: Math.max(0, (produitSelectionne.stock_global || 0) - qte),
      raison: `Réservation commande vendeur ${compteVendeur.nom_complet}`,
    });

    // Notification de confirmation au vendeur
    await base44.entities.NotificationVendeur.create({
      vendeur_email: compteVendeur.user_email,
      titre: "Commande envoyée !",
      message: `Votre commande de ${qte}x ${produitSelectionne.nom} pour ${form.client_nom} a été transmise à l'équipe ZONITE pour validation.`,
      type: "succes",
    });

    queryClient.invalidateQueries({ queryKey: ["commandes_vendeur"] });
    setEnCours(false);
    setSucces(true);
    } catch (err) {
      setErreur(err.message || "Erreur lors de la création de la commande");
      setEnCours(false);
    }
  };

  if (succes) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Commande envoyée !</h2>
          <p className="text-sm text-slate-500 mb-6">Votre commande a été transmise à l'équipe ZONITE. Vous serez notifié à chaque mise à jour.</p>
          <div className="space-y-3">
            <Button onClick={() => { setSucces(false); setForm(f => ({ ...f, client_nom: "", client_telephone: "", client_ville: "", client_quartier: "", client_adresse: "", notes: "" })); }} className="w-full bg-[#1a1f5e] hover:bg-[#141952]">
              Nouvelle commande
            </Button>
            <Link to={createPageUrl("MesCommandesVendeur")}>
              <Button variant="outline" className="w-full">Voir mes commandes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-[#1a1f5e] text-white px-4 pb-4" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">Nouvelle commande</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {erreur && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {erreur}
          </div>
        )}

        {/* Produit */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">Produit</h2>
          <div className="space-y-1">
            <Label>Produit *</Label>
            <Select value={form.produit_id} onValueChange={v => modifier("produit_id", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
              <SelectContent>
                {produits.map(p => (
                  <SelectItem key={p.id} value={p.id} disabled={(p.stock_global || 0) <= 0}>
                    {p.nom} — Dispo: {p.stock_global || 0}{(p.stock_global || 0) <= 0 ? " (rupture)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {produitSelectionne && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="text-slate-500">Prix de gros : <span className="font-bold text-slate-900">{formater(prixGros)}</span></p>
              <p className="text-xs text-slate-400 mt-1">Vous fixez librement votre prix de vente final (≥ prix de gros)</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Quantité *</Label>
              <Input type="number" min="1" value={form.quantite} onFocus={e => e.target.select()} onChange={e => modifier("quantite", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Prix final client (FCFA) *</Label>
              <Input type="number" min="0" value={form.prix_final_client} onFocus={e => e.target.select()} onChange={e => modifier("prix_final_client", e.target.value)} placeholder="0" />
            </div>
          </div>
          {prixFinal >= prixGros && prixFinal > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
              <p className="text-slate-600">Votre commission estimée :</p>
              <p className="font-bold text-emerald-700 text-lg">{formater(commission)}</p>
              <p className="text-xs text-slate-400">({formater(prixFinal - prixGros)} × {qte} unité{qte > 1 ? "s" : ""})</p>
            </div>
          )}


        </div>

        {/* Client */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">Informations client</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nom du client *</Label>
              <Input value={form.client_nom} onChange={e => modifier("client_nom", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Téléphone client *</Label>
              <Input value={form.client_telephone} onChange={e => modifier("client_telephone", e.target.value)} placeholder="+237 6XX XXX XXX" />
            </div>
            <div className="space-y-1">
              <Label>Ville *</Label>
              <Input value={form.client_ville} onChange={e => modifier("client_ville", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Quartier</Label>
              <Input value={form.client_quartier} onChange={e => modifier("client_quartier", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Adresse précise</Label>
              <Input value={form.client_adresse} onChange={e => modifier("client_adresse", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => modifier("notes", e.target.value)} rows={2} placeholder="Instructions spéciales..." />
          </div>
        </div>

        <Button onClick={soumettre} disabled={enCours} className="w-full h-12 bg-[#1a1f5e] hover:bg-[#141952] text-white font-bold text-base">
          {enCours ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer la commande →"}
        </Button>
      </div>
    </div>
  );
}