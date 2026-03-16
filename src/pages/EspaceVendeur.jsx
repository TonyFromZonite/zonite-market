import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCachedQuery } from "@/components/CacheManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import {
  ShoppingBag, Package,
  Clock, CheckCircle2, XCircle, Truck, Plus,
  AlertCircle, Upload, Loader2
} from "lucide-react";
import { getVendeurSession, clearAllSessions } from "@/components/useSessionGuard";
import { LOGO_URL as LOGO } from "@/components/constants";
import NotificationCenterVendeur from "@/components/NotificationCenterVendeur";
import { SELLER_STATUSES, canAccessFeature, shouldShowTrainingModal } from "@/components/SellerStatusEngine";
import BanniereKycPending from "@/components/BanniereKycPending";

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
  const [restrictionMessage, setRestrictionMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  // KYC modal state
  const [typeDocument, setTypeDocument] = useState("cni");
  const [kycForm, setKycForm] = useState({ photo_identite_url: "", photo_identite_verso_url: "", selfie_url: "" });
  const [kycUpload, setKycUpload] = useState({ id: false, idVerso: false, selfie: false });
  const [kycErreur, setKycErreur] = useState("");
  const [kycEnCours, setKycEnCours] = useState(false);

  const uploadKycFile = async (fichier, champ) => {
    const key = champ === "photo_identite_url" ? "id" : champ === "photo_identite_verso_url" ? "idVerso" : "selfie";
    setKycUpload(p => ({ ...p, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file: fichier });
    setKycForm(p => ({ ...p, [champ]: file_url }));
    setKycUpload(p => ({ ...p, [key]: false }));
  };

  const soumettreKyc = async () => {
    if (!kycForm.photo_identite_url) { setKycErreur("Veuillez uploader votre pièce d'identité."); return; }
    if (typeDocument === "cni" && !kycForm.photo_identite_verso_url) { setKycErreur("Veuillez uploader le verso de votre CNI."); return; }
    if (!kycForm.selfie_url) { setKycErreur("Veuillez uploader votre selfie."); return; }
    setKycEnCours(true);
    setKycErreur("");
    const response = await base44.functions.invoke('updateKYCDocuments', {
      email: compteVendeur.email,
      photo_identite_url: kycForm.photo_identite_url,
      photo_identite_verso_url: kycForm.photo_identite_verso_url || "",
      selfie_url: kycForm.selfie_url,
    });
    setKycEnCours(false);
    if (response.data?.success) {
      setCompteVendeur(prev => ({ ...prev, seller_status: 'kyc_pending' }));
    } else {
      setKycErreur(response.data?.error || "Erreur lors de la soumission.");
    }
  };

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
        
        setUtilisateur({ email: session.email });
        
        // If session already has seller data from login, use it directly
        if (session.id && session.nom_complet) {
          setCompteVendeur(session);
          
          // Subscribe to real-time updates by ID
          const unsubscribe = base44.entities.Seller.subscribe((event) => {
            if (event.id === session.id) {
              setCompteVendeur(event.data);
            }
          });
          
          setChargement(false);
          return unsubscribe;
        }
        
        // Otherwise, fetch from database via backend function (bypasse les restrictions RLS)
        const emailVendeur = session.email;
        try {
          const resp = await base44.functions.invoke('vendeurActions', {
            action: 'getSellerByEmail',
            vendeur_email: emailVendeur,
            payload: {},
          });
          const sellerData = resp.data?.seller;
          if (sellerData) {
            setCompteVendeur(sellerData);
            // Enrichir la session avec les données complètes
            sessionStorage.setItem("vendeur_session", JSON.stringify({ ...session, ...sellerData, role: 'vendeur' }));

            const unsubscribe = base44.entities.Seller.subscribe((event) => {
              if (event.data?.email === emailVendeur) {
                setCompteVendeur(event.data);
              }
            });

            setChargement(false);
            return unsubscribe;
          } else {
            window.location.href = createPageUrl("Connexion");
          }
        } catch (_) {
          // Fallback direct si la fonction échoue
          const sellers = await base44.entities.Seller.filter({ email: emailVendeur });
          if (sellers.length > 0) {
            setCompteVendeur(sellers[0]);
            setChargement(false);
          } else {
            window.location.href = createPageUrl("Connexion");
          }
        }
      } catch (error) {
        console.error('Erreur chargement espace vendeur:', error);
        window.location.href = createPageUrl("Connexion");
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

  // Block access based on seller status
  if (!canAccessFeature(compteVendeur.seller_status, "dashboard")) {
    if (compteVendeur.seller_status === SELLER_STATUSES.PENDING_VERIFICATION) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">Email à vérifier</h2>
            <p className="text-sm text-slate-500">Veuillez vérifier votre email pour continuer l'inscription.</p>
          </div>
        </div>
      );
    }
  }

  // KYC rejected
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
      {/* Restriction message modal */}
      {restrictionMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">Accès restreint</h2>
            <p className="text-sm text-slate-500 mb-4">{restrictionMessage}</p>
            <Button onClick={() => setRestrictionMessage(null)} className="w-full bg-[#1a1f5e] hover:bg-[#141952]">
              Fermer
            </Button>
          </div>
        </div>
      )}

      {/* Modal KYC obligatoire — non fermable sans soumettre */}
      {compteVendeur.seller_status === SELLER_STATUSES.KYC_REQUIRED && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📋</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Complétez votre vérification KYC</h2>
              <p className="text-xs text-slate-500 mt-1">Uploadez vos documents pour activer votre compte.</p>
            </div>

            {/* Type document */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setTypeDocument("cni"); setKycForm(p => ({ ...p, photo_identite_verso_url: "" })); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${typeDocument === "cni" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                🪪 CNI
              </button>
              <button onClick={() => { setTypeDocument("passeport"); setKycForm(p => ({ ...p, photo_identite_verso_url: "" })); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${typeDocument === "passeport" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                📘 Passeport
              </button>
            </div>

            {/* Recto */}
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">{typeDocument === "cni" ? "CNI Recto *" : "Page principale *"}</p>
              <label className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed cursor-pointer transition-all ${kycForm.photo_identite_url ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}>
                {kycUpload.id ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> :
                  kycForm.photo_identite_url ? <><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" /><span className="text-xs text-emerald-600 font-medium">Uploadé ✓</span></> :
                  <><Upload className="w-5 h-5 text-slate-400 mb-1" /><span className="text-xs text-slate-400">Appuyer pour uploader</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadKycFile(e.target.files[0], "photo_identite_url")} />
              </label>
            </div>

            {/* Verso CNI */}
            {typeDocument === "cni" && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1">CNI Verso *</p>
                <label className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed cursor-pointer transition-all ${kycForm.photo_identite_verso_url ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}>
                  {kycUpload.idVerso ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> :
                    kycForm.photo_identite_verso_url ? <><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" /><span className="text-xs text-emerald-600 font-medium">Uploadé ✓</span></> :
                    <><Upload className="w-5 h-5 text-slate-400 mb-1" /><span className="text-xs text-slate-400">Appuyer pour uploader</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadKycFile(e.target.files[0], "photo_identite_verso_url")} />
                </label>
              </div>
            )}

            {/* Selfie */}
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">Selfie avec pièce d'identité *</p>
              <label className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed cursor-pointer transition-all ${kycForm.selfie_url ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}>
                {kycUpload.selfie ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> :
                  kycForm.selfie_url ? <><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" /><span className="text-xs text-emerald-600 font-medium">Uploadé ✓</span></> :
                  <><Upload className="w-5 h-5 text-slate-400 mb-1" /><span className="text-xs text-slate-400">Selfie avec votre pièce visible</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadKycFile(e.target.files[0], "selfie_url")} />
              </label>
            </div>

            {kycErreur && <p className="text-red-500 text-xs mb-3 text-center">{kycErreur}</p>}

            <Button onClick={soumettreKyc} disabled={kycEnCours || kycUpload.id || kycUpload.idVerso || kycUpload.selfie}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11">
              {kycEnCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Soumettre mes documents"}
            </Button>
          </div>
        </div>
      )}

      {/* Bannière jaune kyc_pending — pas de modal bloquant */}

      {/* Training Required modal - show if training not completed */}
      {shouldShowTrainingModal(compteVendeur.seller_status, compteVendeur.training_completed) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎬</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Formation obligatoire</h2>
            <p className="text-sm text-slate-500 mb-4">Regardez la vidéo de présentation ZONITE pour déverrouiller l'accès complet.</p>
            <Link to={createPageUrl("VideoFormation")}>
              <Button className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
                Commencer la formation →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Bannière KYC en attente */}
      {compteVendeur.seller_status === SELLER_STATUSES.KYC_PENDING && <BanniereKycPending />}

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
          {canAccessFeature(compteVendeur.seller_status, "sales", compteVendeur.training_completed) ? (
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
          ) : (
            <button disabled className="cursor-not-allowed">
              <div className="bg-slate-300 text-slate-500 rounded-2xl p-4 flex items-center gap-3 opacity-60">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Nouvelle</p>
                  <p className="text-xs">commande</p>
                </div>
              </div>
            </button>
          )}
          {canAccessFeature(compteVendeur.seller_status, "catalog", compteVendeur.training_completed) ? (
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
          ) : (
            <button disabled className="cursor-not-allowed">
              <div className="bg-slate-300 text-slate-500 rounded-2xl p-4 flex items-center gap-3 opacity-60">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Catalogue</p>
                  <p className="text-xs">produits</p>
                </div>
              </div>
            </button>
          )}
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
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠", feature: "dashboard" },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋", feature: "sales" },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦", feature: "catalog" },
          { label: "Profil", page: "ProfilVendeur", icone: "👤", feature: "profile" },
          { label: "Aide", page: "AideVendeur", icone: "❓", feature: "dashboard" },
        ].map(({ label, page, icone, feature }) => {
          const canAccess = canAccessFeature(compteVendeur.seller_status, feature, compteVendeur.training_completed);
          return canAccess ? (
            <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-2.5 gap-1 hover:text-[#1a1f5e] transition-colors">
              <span className="text-xl">{icone}</span>
              <span className="text-[10px] text-slate-500">{label}</span>
            </Link>
          ) : (
            <button key={page} disabled className="flex-1 flex flex-col items-center py-2.5 gap-1 opacity-40 cursor-not-allowed">
              <span className="text-xl">{icone}</span>
              <span className="text-[10px] text-slate-400">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}