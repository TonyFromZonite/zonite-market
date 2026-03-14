import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const ICONES_TYPE = {
  kyc_soumis: "👤",
  kyc_valide: "✅",
  kyc_rejete: "❌",
  nouvelle_vente: "🛒",
  commande_validee: "✓",
  commande_livree: "📦",
  stock_faible: "⚠️",
  paiement_demande: "💰",
  paiement_effectue: "💵",
  retour_produit: "↩️",
  support_ticket: "💬",
  systeme: "⚙️",
};

export default function NotificationCenterVendeur() {
  const [ouvert, setOuvert] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications-vendeur"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const notifs = await base44.entities.Notification.filter(
        { destinataire_email: user.email },
        "-created_date",
        30
      );
      return notifs;
    },
    refetchInterval: 15000, // Rafraîchir toutes les 15 secondes
  });

  const marquerCommeLueMutation = useMutation({
    mutationFn: async (notifId) => {
      await base44.entities.Notification.update(notifId, {
        lue: true,
        date_lecture: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-vendeur"] });
    },
  });

  const supprimerMutation = useMutation({
    mutationFn: async (notifId) => {
      await base44.entities.Notification.delete(notifId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-vendeur"] });
    },
  });

  const handleClickNotification = (notif) => {
    if (!notif.lue) {
      marquerCommeLueMutation.mutate(notif.id);
    }
    if (notif.lien) {
      setOuvert(false);
      navigate(notif.lien);
    }
  };

  const nbNonLues = notifications.filter((n) => !n.lue).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <Bell className="w-6 h-6 text-white" />
        {nbNonLues > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-red-500 text-white text-xs px-1 border-2 border-[#1a1f5e]">
            {nbNonLues > 9 ? "9+" : nbNonLues}
          </Badge>
        )}
      </button>

      {ouvert && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOuvert(false)}
          />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Notifications ({nbNonLues} non lues)
              </h3>
              <button
                onClick={() => setOuvert(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ScrollArea className="flex-1 p-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleClickNotification(notif)}
                      className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all ${
                        !notif.lue
                          ? "bg-blue-50 border-blue-200 border-l-4 border-l-blue-500"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-xl flex-shrink-0">
                          {ICONES_TYPE[notif.type] || "📢"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium ${
                                !notif.lue ? "text-slate-900" : "text-slate-600"
                              }`}
                            >
                              {notif.titre}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                supprimerMutation.mutate(notif.id);
                              }}
                              className="text-slate-400 hover:text-red-500 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(notif.created_date).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}