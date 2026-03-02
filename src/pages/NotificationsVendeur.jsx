import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, ChevronLeft } from "lucide-react";

const COULEURS = {
  info: "bg-blue-50 border-blue-100 text-blue-800",
  succes: "bg-emerald-50 border-emerald-100 text-emerald-800",
  alerte: "bg-yellow-50 border-yellow-100 text-yellow-800",
  paiement: "bg-purple-50 border-purple-100 text-purple-800",
};

const EMOJIS = { info: "ℹ️", succes: "✅", alerte: "⚠️", paiement: "💰" };

export default function NotificationsVendeur() {
  const [utilisateur, setUtilisateur] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setUtilisateur(u));
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifs_vendeur", utilisateur?.email],
    queryFn: () => base44.entities.NotificationVendeur.filter({ vendeur_email: utilisateur.email }, "-created_date", 50),
    enabled: !!utilisateur?.email,
  });

  const marquerLue = async (notif) => {
    if (!notif.lue) {
      await base44.entities.NotificationVendeur.update(notif.id, { lue: true });
      queryClient.invalidateQueries({ queryKey: ["notifs_vendeur"] });
    }
  };

  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-[#1a1f5e] text-white px-4 pt-6 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-lg font-bold">Notifications</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucune notification</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => marquerLue(n)}
              className={`border rounded-2xl p-4 cursor-pointer transition-opacity ${COULEURS[n.type] || COULEURS.info} ${n.lue ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{EMOJIS[n.type] || "ℹ️"}</span>
                <div className="flex-1 min-w-0">
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50">
        {[
          { label: "Accueil", page: "EspaceVendeur", icone: "🏠" },
          { label: "Commandes", page: "MesCommandesVendeur", icone: "📋" },
          { label: "Catalogue", page: "CatalogueVendeur", icone: "📦" },
          { label: "Profil", page: "ProfilVendeur", icone: "👤" },
        ].map(({ label, page, icone }) => (
          <Link key={page} to={createPageUrl(page)} className="flex-1 flex flex-col items-center py-3 gap-1">
            <span className="text-xl">{icone}</span>
            <span className="text-[10px] text-slate-600">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}