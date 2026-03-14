import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCachedQuery } from "@/components/CacheManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ShoppingBag, Bell, Package,
  Clock, CheckCircle2, XCircle, Truck, Plus,
  AlertCircle, Eye
} from "lucide-react";
import { getVendeurSession, clearAllSessions } from "@/components/useSessionGuard";
import { LOGO_URL as LOGO } from "@/components/constants";
import NotificationCenterVendeur from "@/components/NotificationCenterVendeur";

const STATUTS = {
  en_attente_validation_admin: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800" },
  validee_admin:               { label: "Validée", couleur: "bg-blue-100 text-blue-800" },
  attribuee_livreur:           { label: "Livreur attribué", couleur: "bg-indigo-100 text-indigo-800" },
  en_livraison:                { label: "En livraison 🚚", couleur: "bg-purple-100 text-purple-800" },
  livree:                      { label: "Livrée ✓", couleur: "bg-emerald-100 text-emerald-800" },
  echec_livraison:             { label: "Échec", couleur: "bg-orange-100 text-orange-800" },
  annulee:                     { label: "Annulée", couleur: "bg-red-100 text-red-800" },
};

export default function EspaceVendeur() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // 'kyc' | 'video' | null
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const charger = async () => {
      try {
        // Essayer d'abord la session stockée
        let session = getVendeurSession();
        
        // Si pas de session mais connecté à Base44, créer une session vendeur
        if (!session) {
          try {
            const user = await base44.auth.me();
            if (user && user.role === 'user') {
              session = { role: 'vendeur', email: user.email };
              sessionStorage.setItem("vendeur_session", JSON.stringify(session));
            }
          } catch (_) {
            // Pas connecté à Base44
          }
        }
        
        if (!session) {
          window.location.href = createPageUrl("Connexion");
          return;
        }
        
        const emailVendeur = session.email;
        setUtilisateur({ email: emailVendeur });
        const sellers = await base44.entities.Seller.filter({ email: emailVendeur });
        if (sellers.length > 0) {
          setCompteVendeur(sellers[0]);
        } else {
          window.location.href = createPageUrl("Connexion");
        }
      } catch (error) {
        console.error('Erreur chargement espace vendeur:', error);
        window.location.href = createPageUrl("Connexion");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const { data: commandes = [] } = useCachedQuery(
    'COMMANDES',
    () => base44.entities.CommandeVendeur.filter({ vendeur_id: compteVendeur.id }, "-created_date", 50),
    { ttl: 5 * 60 * 1000, enabled: !!compteVendeur?.id }
  );

  const { data: compteActualise, isLoading: loadingCompte } = useCachedQuery(
    'COMPTE_VENDEUR',
    () => base44.entities.Seller.filter({ id: compteVendeur.id }),
    { ttl: 3 * 60 * 1000, enabled: !!compteVendeur?.id }
  );

  const soldeAffiche = compteActualise?.[0] || compteVendeur;
  
  // Attendre le chargement du compte avant d'afficher
  if (loadingCompte && !compteActualise) {
    return (
      <div className="p-4 space-y-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  if (chargement) {
    return (
      <div className="p-4 space-y-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  // Pas de compte vendeur trouvé
  if (!compteVendeur) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Compte introuvable</h2>
          <p className="text-sm text-slate-500 mb-4">Aucun compte vendeur n'est associé à cet email. Inscrivez-vous d'abord.</p>
          <Link to={createPageUrl("InscriptionVendeur")}>
            <Button className="w-full bg-[#1a1f5e] hover:bg-[#141952]">Créer mon compte</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Compte rejeté KYC
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

  // Auto-initialize first-login modal based on account state
  useEffect(() => {
    if (!compteVendeur || activeModal) return;

    // Seller created by admin: KYC is auto-validated, show video modal if not watched
    if (compteVendeur.created_by && compteVendeur.statut_kyc === "valide" && !compteVendeur.video_vue) {
      setActiveModal('video');
    } 
    // Self-registered seller: KYC status is pending, show KYC modal
    else if (!compteVendeur.created_by && compteVendeur.statut_kyc === "en_attente") {
      setActiveModal('kyc');
    }
    // KYC approved but video not watched yet
    else if (compteVendeur.statut_kyc === "valide" && !compteVendeur.video_vue) {
      setActiveModal('video');
    }
  }, [compteVendeur, activeModal]);
  const commandesEnAttente = (commandes || []).filter(c => ["en_attente_validation_admin", "validee_admin", "attribuee_livreur"].includes(c.statut)).length;
  const commandesReussies = (commandes || []).filter(c => c.statut === "livree").length;
  const commandesEchouees = (commandes || []).filter(c => ["echec_livraison", "annulee"].includes(c.statut)).length;
  const commandesEnLivraison = (commandes || []).filter(c => c.statut === "en_livraison").length;

  // État de chargement si données critiques manquent
  if (!compteVendeur || !soldeAffiche) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Modal KYC - Self-registered sellers awaiting validation */}
      {activeModal === 'kyc' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Complétez votre dossier KYC</h2>
            <p className="text-sm text-slate-500 mb-4">Nous avons besoin de vérifier votre identité avant que vous puissiez commencer à vendre. Cela prend quelques minutes.</p>
            <Link to={createPageUrl("ResoumissionKYC")}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Soumettre mes documents →
              </Button>
            </Link>
            <p className="text-xs text-slate-400 mt-3">Vous pouvez consulter votre profil en attendant.</p>
          </div>
        </div>
      )}

      {/* Modal Video - Watch training before catalog access */}
      {activeModal === 'video' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎬</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Formation obligatoire</h2>
            <p className="text-sm text-slate-500 mb-4">Regardez la vidéo de présentation ZONITE pour déverrouiller l'accès au catalogue produits et commencer à vendre.</p>
            <Link to={createPageUrl("VideoFormation")}>
              <Button className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
                Commencer la formation →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 pt-6 pb-10" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Zonite" className="h-9 w-9 rounded-xl object-contain bg-white p-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold tracking-tight leading-none">ZONITE <span className="text-[#F5C518]">Vendeurs</span></span>
              <p className="text-slate-300 text-xs mt-0.5">Bonjour 👋 {compteVendeur.nom_complet}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenterVendeur />
          </div>
        </div>
        {/* Solde */}
        <div className="mt-4 bg-white/10 rounded-2xl p-4">
          <p className="text-slate-300 text-xs mb-1">Solde commissions disponible</p>
          <p className="text-3xl font-bold text-[#F5C518]">{formater(soldeAffiche.solde_commission)}</p>
          <p className="text-xs text-slate-300 mt-1">Total gagné : {formater(soldeAffiche.total_commissions_gagnees)}</p>
          {(soldeAffiche.solde_commission || 0) >= 5000 ? (
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
          {(commandes || []).length === 0 ? (
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
          { label: "Aide", page: "AideVendeur", icone: "❓", actif: false },
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

// Dialog KYC pour vendeur
function KYCDialog({ open, onOpenChange, vendeur, onSuccess }) {
  const [notes, setNotes] = useState(vendeur?.notes_admin || "");
  const [enCours, setEnCours] = useState(false);

  const verifierKYC = async () => {
    if (!vendeur?.photo_identite_url || !vendeur?.selfie_url) {
      alert('Documents KYC incomplets');
      return;
    }
    
    setEnCours(true);
    try {
      const response = await base44.functions.invoke('validateKYC', {
        seller_id: vendeur.id,
        statut: 'valide',
        notes: notes || ''
      });
      
      if (response.data?.success) {
        onSuccess();
        setNotes("");
      } else {
        alert('Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Erreur KYC:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mon dossier KYC</DialogTitle>
        </DialogHeader>
        
        {vendeur && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-400">Email</p><p className="font-medium">{vendeur.email}</p></div>
              <div><p className="text-slate-400">Téléphone</p><p className="font-medium">{vendeur.telephone}</p></div>
              <div><p className="text-slate-400">Ville</p><p className="font-medium">{vendeur.ville}</p></div>
              <div><p className="text-slate-400">Quartier</p><p className="font-medium">{vendeur.quartier || "—"}</p></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {vendeur.photo_identite_url && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Pièce d'identité</p>
                  <img src={vendeur.photo_identite_url} alt="ID" className="w-full rounded-lg object-cover h-32 cursor-pointer hover:opacity-80" onClick={() => window.open(vendeur.photo_identite_url)} />
                </div>
              )}
              {vendeur.selfie_url && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Selfie</p>
                  <img src={vendeur.selfie_url} alt="Selfie" className="w-full rounded-lg object-cover h-32 cursor-pointer hover:opacity-80" onClick={() => window.open(vendeur.selfie_url)} />
                </div>
              )}
            </div>

            {vendeur.notes_admin && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800"><strong>Notes :</strong> {vendeur.notes_admin}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {vendeur?.statut_kyc === "en_attente" && (
            <Button onClick={verifierKYC} disabled={enCours} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {enCours ? "Vérification..." : "Validé & Continuer"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}