import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ShoppingBag, Bell, Package,
  Clock, CheckCircle2, XCircle, Truck, Plus,
  AlertCircle
} from "lucide-react";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg";

const STATUTS = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800" },
  en_preparation: { label: "En préparation", couleur: "bg-blue-100 text-blue-800" },
  en_livraison: { label: "En livraison", couleur: "bg-purple-100 text-purple-800" },
  livree: { label: "Livrée ✓", couleur: "bg-emerald-100 text-emerald-800" },
  echec: { label: "Échec", couleur: "bg-red-100 text-red-800" },
};

export default function EspaceVendeur() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const charger = async () => {
      const u = await base44.auth.me();
      setUtilisateur(u);
      const comptes = await base44.entities.CompteVendeur.filter({ user_email: u.email });
      if (comptes.length > 0) setCompteVendeur(comptes[0]);
      setChargement(false);
    };
    charger();
  }, []);

  const { data: commandes = [] } = useQuery({
    queryKey: ["commandes_vendeur", compteVendeur?.id],
    queryFn: () => base44.entities.CommandeVendeur.filter({ vendeur_id: compteVendeur.id }, "-created_date", 50),
    enabled: !!compteVendeur?.id,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifs_vendeur", utilisateur?.email],
    queryFn: () => base44.entities.NotificationVendeur.filter({ vendeur_email: utilisateur.email }, "-created_date", 10),
    enabled: !!utilisateur?.email,
  });

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  if (chargement) {
    return (
      <div className="p-4 space-y-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  // KYC non validé
  if (!compteVendeur) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Compte non configuré</h2>
          <p className="text-sm text-slate-500 mb-4">Vous devez compléter votre profil vendeur pour accéder à l'espace vendeur.</p>
          <Link to={createPageUrl("InscriptionVendeur")}>
            <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952]">Compléter mon profil</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (compteVendeur.statut_kyc === "en_attente") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
          <Clock className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">En attente de validation</h2>
          <p className="text-sm text-slate-500">Votre compte est en cours de vérification par notre équipe. Vous recevrez une notification dès que votre compte sera activé.</p>
        </div>
      </div>
    );
  }

  if (compteVendeur.statut_kyc === "rejete") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Dossier rejeté</h2>
          <p className="text-sm text-slate-500">{compteVendeur.notes_admin || "Votre dossier KYC a été rejeté. Contactez notre équipe pour plus d'informations."}</p>
        </div>
      </div>
    );
  }

  // Vidéo non vue
  if (!compteVendeur.catalogue_debloque) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Link to={createPageUrl("VideoFormation")}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg cursor-pointer hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎬</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Formation obligatoire</h2>
            <p className="text-sm text-slate-500 mb-4">Regardez la vidéo de présentation ZONITE pour déverrouiller le catalogue produits.</p>
            <Button className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
              Commencer la formation →
            </Button>
          </div>
        </Link>
      </div>
    );
  }

  const notifsNonLues = notifications.filter(n => !n.lue).length;
  const commandesEnAttente = commandes.filter(c => c.statut === "en_attente").length;
  const commandesReussies = commandes.filter(c => c.statut === "livree").length;
  const commandesEchouees = commandes.filter(c => c.statut === "echec").length;
  const commandesEnLivraison = commandes.filter(c => c.statut === "en_livraison").length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 pt-6 pb-10">
        <div className="flex justify-between items-center mb-1">
          <div>
            <p className="text-slate-300 text-sm">Bonjour 👋</p>
            <h1 className="text-lg font-bold">{compteVendeur.nom_complet}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("NotificationsVendeur")} className="relative">
              <Bell className="w-6 h-6 text-white" />
              {notifsNonLues > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F5C518] rounded-full text-[10px] font-bold text-[#1a1f5e] flex items-center justify-center">
                  {notifsNonLues}
                </span>
              )}
            </Link>
          </div>
        </div>
        {/* Solde */}
        <div className="mt-4 bg-white/10 rounded-2xl p-4">
          <p className="text-slate-300 text-xs mb-1">Solde commissions disponible</p>
          <p className="text-3xl font-bold text-[#F5C518]">{formater(compteVendeur.solde_commission)}</p>
          {(compteVendeur.solde_commission || 0) >= 5000 ? (
            <Link to={createPageUrl("DemandePaiement")}>
              <Button size="sm" className="mt-3 bg-[#F5C518] text-[#1a1f5e] hover:bg-[#e0b010] font-bold">
                Demander un paiement →
              </Button>
            </Link>
          ) : (
            <p className="text-xs text-slate-300 mt-2">Minimum 5 000 FCFA pour demander un paiement</p>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 -mt-5">
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "En attente", val: commandesEnAttente, icone: Clock, couleur: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "En livraison", val: commandesEnLivraison, icone: Truck, couleur: "text-purple-600", bg: "bg-purple-50" },
            { label: "Réussies", val: commandesReussies, icone: CheckCircle2, couleur: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Échouées", val: commandesEchouees, icone: XCircle, couleur: "text-red-600", bg: "bg-red-50" },
          ].map(({ label, val, icone: Icone, couleur, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-2`}>
                <Icone className={`w-4 h-4 ${couleur}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{val}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link to={createPageUrl("NouvelleCommandeVendeur")}>
            <div className="bg-[#1a1f5e] text-white rounded-2xl p-4 flex items-center gap-3 hover:bg-[#141952] transition-colors">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Nouvelle</p>
                <p className="text-xs text-slate-300">commande</p>
              </div>
            </div>
          </Link>
          <Link to={createPageUrl("CatalogueVendeur")}>
            <div className="bg-[#F5C518] text-[#1a1f5e] rounded-2xl p-4 flex items-center gap-3 hover:bg-[#e0b010] transition-colors">
              <div className="w-10 h-10 bg-[#1a1f5e]/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Catalogue</p>
                <p className="text-xs text-[#1a1f5e]/70">produits</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Commandes récentes */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">Commandes récentes</h3>
            <Link to={createPageUrl("MesCommandesVendeur")}>
              <span className="text-xs text-blue-600">Voir tout →</span>
            </Link>
          </div>
          {commandes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Aucune commande pour l'instant
            </div>
          ) : (
            commandes.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{c.produit_nom}</p>
                  <p className="text-xs text-slate-500">{c.client_nom} • {c.client_ville}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <Badge className={`${STATUTS[c.statut]?.couleur} text-xs border-0`}>
                    {STATUTS[c.statut]?.label}
                  </Badge>
                  <p className="text-xs text-emerald-600 font-bold mt-1">+{formater(c.commission_vendeur)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠", actif: true },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋", actif: false },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦", actif: false },
          { label: "Profil", page: "ProfilVendeur", icone: "👤", actif: false },
        ].map(({ label, page, icone, actif }) => (
          <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-2.5 gap-1">
            <span className="text-xl">{icone}</span>
            <span className={`text-[10px] ${actif ? "text-[#1a1f5e] font-bold" : "text-slate-500"}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}