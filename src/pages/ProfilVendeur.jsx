import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LogOut, ChevronLeft, User, Phone, MapPin, Wallet, TrendingUp, ShoppingBag, KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg";

export default function ProfilVendeur() {
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [chargement, setChargement] = useState(true);

  // Changement de mot de passe
  const [ouvrirChangeMdp, setOuvrirChangeMdp] = useState(false);
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmerMdp, setConfirmerMdp] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [erreurMdp, setErreurMdp] = useState("");
  const [succesMdp, setSuccesMdp] = useState(false);
  const [saveMdpEnCours, setSaveMdpEnCours] = useState(false);

  useEffect(() => {
    const charger = async () => {
      let emailVendeur = null;
      
      // Session vendeur prioritaire
      try {
        const session = sessionStorage.getItem("vendeur_session");
        if (session) {
          const parsed = JSON.parse(session);
          emailVendeur = parsed.email;
        }
      } catch (_) {}

      if (!emailVendeur) {
        const u = await base44.auth.me().catch(() => null);
        if (u?.email) emailVendeur = u.email;
      }

      if (emailVendeur) {
        const comptes = await base44.entities.CompteVendeur.filter({ user_email: emailVendeur });
        if (comptes.length > 0) setCompteVendeur(comptes[0]);
      }
      setChargement(false);
    };
    charger();
  }, []);

  const formater = n => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    setErreurMdp("");
    if (!ancienMdp || !nouveauMdp || !confirmerMdp) { setErreurMdp("Tous les champs sont requis."); return; }
    if (nouveauMdp.length < 8) { setErreurMdp("Minimum 8 caractères requis."); return; }
    if (!/[A-Z]/.test(nouveauMdp)) { setErreurMdp("Doit contenir au moins 1 majuscule."); return; }
    if (!/[0-9]/.test(nouveauMdp)) { setErreurMdp("Doit contenir au moins 1 chiffre."); return; }
    if (nouveauMdp !== confirmerMdp) { setErreurMdp("Les mots de passe ne correspondent pas."); return; }
    setSaveMdpEnCours(true);
    try {
      const response = await base44.functions.invoke('changePassword', {
        oldPassword: ancienMdp,
        newPassword: nouveauMdp,
        userType: 'vendeur'
      });
      if (response.data.success) {
        setSuccesMdp(true);
        setAncienMdp(""); setNouveauMdp(""); setConfirmerMdp("");
        setTimeout(() => { setSuccesMdp(false); setOuvrirChangeMdp(false); }, 2500);
      } else {
        setErreurMdp(response.data.error || "Erreur lors du changement de mot de passe.");
      }
    } catch (_) {
      setErreurMdp("Erreur lors du changement de mot de passe.");
    }
    setSaveMdpEnCours(false);
  };

  if (chargement) return (
    <div className="p-4 space-y-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-[#1a1f5e] text-white px-4 pb-8" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <img src={LOGO} alt="Zonite" className="h-7 w-7 rounded-lg object-contain bg-white p-0.5" />
          <h1 className="text-lg font-bold">Mon Profil</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#F5C518] rounded-2xl flex items-center justify-center text-[#1a1f5e] text-2xl font-bold">
            {compteVendeur?.nom_complet?.[0]?.toUpperCase() || "V"}
          </div>
          <div>
            <p className="font-bold text-lg">{compteVendeur?.nom_complet || "Vendeur"}</p>
            <Badge className={`text-xs border-0 mt-1 ${compteVendeur?.statut === "actif" ? "bg-emerald-500 text-white" : "bg-yellow-500 text-white"}`}>
              {compteVendeur?.statut === "actif" ? "✓ Compte actif" : "En attente"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Ventes", val: compteVendeur?.nombre_ventes || 0, icone: ShoppingBag },
            { label: "Commissions", val: formater(compteVendeur?.total_commissions_gagnees), icone: TrendingUp },
            { label: "Solde", val: formater(compteVendeur?.solde_commission), icone: Wallet },
          ].map(({ label, val, icone: Icone }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="font-bold text-slate-900 text-sm">{val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Infos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3 text-sm">Informations personnelles</h2>
          <div className="space-y-3">
            {[
              { icone: User, label: "Nom", val: compteVendeur?.nom_complet },
              { icone: Phone, label: "Téléphone", val: compteVendeur?.telephone },
              { icone: MapPin, label: "Localisation", val: `${compteVendeur?.ville || ""}${compteVendeur?.quartier ? `, ${compteVendeur.quartier}` : ""}` },
              { icone: Wallet, label: "Mobile Money", val: `${compteVendeur?.numero_mobile_money || "—"} (${compteVendeur?.operateur_mobile_money === "orange_money" ? "Orange Money" : "MTN MoMo"})` },
            ].map(({ icone: Icone, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Icone className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-medium text-slate-900">{val || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statut KYC */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-2 text-sm">Statut du compte</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: "KYC", val: compteVendeur?.statut_kyc === "valide" ? "✓ Validé" : "En attente", ok: compteVendeur?.statut_kyc === "valide" },
              { label: "Formation", val: compteVendeur?.video_vue ? "✓ Complétée" : "Non complétée", ok: compteVendeur?.video_vue },
              { label: "Catalogue", val: compteVendeur?.catalogue_debloque ? "✓ Débloqué" : "Verrouillé", ok: compteVendeur?.catalogue_debloque },
            ].map(({ label, val, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-500">{label}</span>
                <span className={`font-medium ${ok ? "text-emerald-600" : "text-yellow-600"}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => { setOuvrirChangeMdp(!ouvrirChangeMdp); setErreurMdp(""); setSuccesMdp(false); }}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium text-slate-900 text-sm">Changer mon mot de passe</span>
            </div>
            <span className="text-slate-400 text-xs">{ouvrirChangeMdp ? "▲" : "▼"}</span>
          </button>

          {ouvrirChangeMdp && (
            <div className="px-4 pb-4">
              {succesMdp ? (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <p className="text-emerald-700 text-sm font-medium">Mot de passe changé avec succès !</p>
                </div>
              ) : (
                <form onSubmit={changerMotDePasse} className="space-y-3">
                  {[
                    { label: "Ancien mot de passe", val: ancienMdp, setter: setAncienMdp },
                    { label: "Nouveau mot de passe", val: nouveauMdp, setter: setNouveauMdp },
                    { label: "Confirmer le nouveau", val: confirmerMdp, setter: setConfirmerMdp },
                  ].map(({ label, val, setter }) => (
                    <div key={label}>
                      <label className="text-xs text-slate-500 block mb-1">{label}</label>
                      <div className="relative">
                        <Input
                          type={afficherMdp ? "text" : "password"}
                          value={val}
                          onChange={(e) => setter(e.target.value)}
                          placeholder="••••••••"
                          className="h-10 pr-10"
                        />
                        <button type="button" onClick={() => setAfficherMdp(!afficherMdp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          {afficherMdp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {erreurMdp && <p className="text-red-500 text-xs">{erreurMdp}</p>}
                  <Button type="submit" disabled={saveMdpEnCours} className="w-full bg-[#1a1f5e] hover:bg-[#141952] h-10 text-sm">
                    {saveMdpEnCours ? "Enregistrement..." : "Mettre à jour le mot de passe"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {(compteVendeur?.solde_commission || 0) >= 5000 && (
          <Link to={createPageUrl("DemandePaiement")}>
            <Button className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
              Demander un paiement → {formater(compteVendeur?.solde_commission)}
            </Button>
          </Link>
        )}

        <Button variant="outline" onClick={() => base44.auth.logout(createPageUrl("Connexion"))} className="w-full border-red-200 text-red-600 hover:bg-red-50">
          <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
        </Button>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠" },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋" },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦" },
          { label: "Profil", page: "ProfilVendeur", icone: "👤" },
        ].map(({ label, page, icone }) => (
          <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-3 gap-1">
            <span className="text-xl">{icone}</span>
            <span className={`text-[10px] ${page === "ProfilVendeur" ? "text-[#1a1f5e] font-bold" : "text-slate-600"}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}