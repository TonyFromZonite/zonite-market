import React, { useState, useEffect } from "react";
import { getVendeurSession } from "@/components/useSessionGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { vendeurApi } from "@/components/vendeurApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, ChevronLeft, CheckCheck, Star } from "lucide-react";

const COULEURS = {
  info: "bg-blue-50 border-blue-100 text-blue-800",
  succes: "bg-emerald-50 border-emerald-100 text-emerald-800",
  alerte: "bg-yellow-50 border-yellow-100 text-yellow-800",
  paiement: "bg-purple-50 border-purple-100 text-purple-800",
};
const EMOJIS = { info: "ℹ️", succes: "✅", alerte: "⚠️", paiement: "💰" };
const TYPES = [
  { val: "tous", label: "Tous" },
  { val: "info", label: "Info" },
  { val: "succes", label: "Succès" },
  { val: "alerte", label: "Alertes" },
  { val: "paiement", label: "Paiements" },
];
const PERIODES = [
  { val: "tous", label: "Toutes dates" },
  { val: "today", label: "Aujourd'hui" },
  { val: "week", label: "Cette semaine" },
  { val: "month", label: "Ce mois" },
];

export default function NotificationsVendeur() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [filtreType, setFiltreType] = useState("tous");
  const [filtrePeriode, setFiltrePeriode] = useState("tous");
  const [filtreLu, setFiltreLu] = useState("tous"); // tous | non_lu | important
  const queryClient = useQueryClient();

  useEffect(() => {
    const session = getVendeurSession();
    if (!session) {
      window.location.href = createPageUrl("Connexion");
      return;
    }
    setUtilisateur({ email: session.email });
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifs_vendeur", utilisateur?.email],
    queryFn: () => base44.entities.NotificationVendeur.filter({ vendeur_email: utilisateur.email }, "-created_date", 100),
    enabled: !!utilisateur?.email,
  });

  const marquerLue = async (notif) => {
    if (!notif.lue) {
      await vendeurApi.marquerNotificationLue(notif.id);
      queryClient.invalidateQueries({ queryKey: ["notifs_vendeur", utilisateur?.email] });
    }
  };

  const toutMarquerLu = async () => {
    const nonLues = notifications.filter(n => !n.lue);
    await vendeurApi.toutMarquerLu(nonLues.map(n => n.id));
    queryClient.invalidateQueries({ queryKey: ["notifs_vendeur", utilisateur?.email] });
  };

  const filtrer = (notifs) => {
    let res = notifs;
    if (filtreType !== "tous") res = res.filter(n => n.type === filtreType);
    if (filtreLu === "non_lu") res = res.filter(n => !n.lue);
    if (filtreLu === "important") res = res.filter(n => n.importante);
    if (filtrePeriode !== "tous") {
      const now = new Date();
      res = res.filter(n => {
        const d = new Date(n.created_date);
        if (filtrePeriode === "today") return d.toDateString() === now.toDateString();
        if (filtrePeriode === "week") return (now - d) < 7 * 86400000;
        if (filtrePeriode === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    return res;
  };

  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  const notifsFiltrees = filtrer(notifications);
  const nbNonLues = notifications.filter(n => !n.lue).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 pb-4 sticky top-0 z-10" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("EspaceVendeur")}>
              <ChevronLeft className="w-6 h-6 text-white" />
            </Link>
            <h1 className="text-lg font-bold">Notifications</h1>
            {nbNonLues > 0 && (
              <span className="bg-[#F5C518] text-[#1a1f5e] text-xs font-bold px-2 py-0.5 rounded-full">{nbNonLues}</span>
            )}
          </div>
          {nbNonLues > 0 && (
            <button onClick={toutMarquerLu} className="flex items-center gap-1 text-xs text-white/70 hover:text-white">
              <CheckCheck className="w-4 h-4" /> Tout lire
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 space-y-2 sticky top-[60px] z-10">
        {/* Filtre type */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TYPES.map(t => (
            <button
              key={t.val}
              onClick={() => setFiltreType(t.val)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtreType === t.val ? "bg-[#1a1f5e] text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Filtre période + lu */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PERIODES.map(p => (
            <button
              key={p.val}
              onClick={() => setFiltrePeriode(p.val)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtrePeriode === p.val ? "bg-[#1a1f5e] text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setFiltreLu(filtreLu === "non_lu" ? "tous" : "non_lu")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtreLu === "non_lu" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Non lues
          </button>
          <button
            onClick={() => setFiltreLu(filtreLu === "important" ? "tous" : "important")}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtreLu === "important" ? "bg-yellow-500 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            <Star className="w-3 h-3" /> Importantes
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : notifsFiltrees.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          notifsFiltrees.map(n => (
            <div
              key={n.id}
              onClick={() => marquerLue(n)}
              className={`border rounded-2xl p-4 cursor-pointer transition-opacity relative ${COULEURS[n.type] || COULEURS.info} ${n.lue ? "opacity-60" : ""}`}
            >
              {n.importante && (
                <Star className="absolute top-3 right-3 w-4 h-4 text-yellow-500 fill-yellow-400" />
              )}
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{EMOJIS[n.type] || "ℹ️"}</span>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{n.titre}</p>
                    {!n.lue && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>}
                  </div>
                  <p className="text-sm mt-0.5">{n.message}</p>
                  <p className="text-xs opacity-60 mt-1">{formaterDate(n.created_date)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠" },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋" },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦" },
          { label: "Profil", page: "ProfilVendeur", icone: "👤" },
          { label: "Aide", page: "AideVendeur", icone: "❓" },
        ].map(({ label, page, icone }) => (
          <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-2.5 gap-1">
            <span className="text-xl">{icone}</span>
            <span className="text-[10px] text-slate-500">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}