import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [vendeurSession, setVendeurSession] = useState(null);
  const [sousAdmin, setSousAdmin] = useState(null);
  const [adminSession, setAdminSession] = useState(null);

  useEffect(() => {
    // Récupérer les sessions
    try {
      const v = sessionStorage.getItem("vendeur_session");
      const sa = sessionStorage.getItem("sous_admin");
      const a = sessionStorage.getItem("admin_session");
      if (v) setVendeurSession(JSON.parse(v));
      if (sa) setSousAdmin(JSON.parse(sa));
      if (a) setAdminSession(JSON.parse(a));
    } catch (_) {}
  }, []);

  useEffect(() => {
    const chargerNotifications = async () => {
      try {
        const notifs = [];

        // Notifications vendeur
        if (vendeurSession?.email) {
          const vendeurNotifs = await base44.entities.NotificationVendeur.filter({
            vendeur_email: vendeurSession.email,
          });
          notifs.push(...vendeurNotifs.map(n => ({ ...n, type: "vendeur" })));
        }

        // Commandes en attente (admin/sous-admin)
        if (adminSession || sousAdmin) {
          const commandesAttente = await base44.entities.CommandeVendeur.filter({
            statut: "en_attente_validation_admin",
          });
          notifs.push(...commandesAttente.map(c => ({
            id: c.id,
            titre: `Nouvelle commande de ${c.vendeur_nom}`,
            message: `${c.quantite} × ${c.produit_nom}`,
            type: "commande",
            created_date: c.created_date,
            lue: false,
          })));
        }

        // Trier par date décroissante
        notifs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setNotifications(notifs);
      } catch (_) {}
    };

    const unsubscribers = [];

    if (vendeurSession || sousAdmin || adminSession) {
      chargerNotifications();

      // Subscription temps réel pour les notifications vendeur
      if (vendeurSession?.email) {
        const unsub = base44.entities.NotificationVendeur.subscribe((event) => {
          if (event.type === "create" && event.data?.vendeur_email === vendeurSession.email) {
            setNotifications(prev => [{ ...event.data, type: "vendeur" }, ...prev]);
          }
        });
        unsubscribers.push(unsub);
      }

      // Subscription temps réel pour les commandes (admin)
      if (adminSession || sousAdmin) {
        const unsub = base44.entities.CommandeVendeur.subscribe((event) => {
          if (event.type === "create" && event.data?.statut === "en_attente_validation_admin") {
            const newNotif = {
              id: event.id,
              titre: `Nouvelle commande de ${event.data.vendeur_nom}`,
              message: `${event.data.quantite} × ${event.data.produit_nom}`,
              type: "commande",
              created_date: event.data.created_date,
              lue: false,
            };
            setNotifications(prev => [newNotif, ...prev]);
          } else if (event.type === "update" && event.data?.statut !== "en_attente_validation_admin") {
            // Retirer la notification si le statut change
            setNotifications(prev => prev.filter(n => n.id !== event.id));
          }
        });
        unsubscribers.push(unsub);
      }

      const interval = setInterval(chargerNotifications, 60000); // Refresh toutes les 60s
      return () => {
        clearInterval(interval);
        unsubscribers.forEach(unsub => unsub());
      };
    }
  }, [vendeurSession, sousAdmin, adminSession]);

  const nonLues = notifications.filter(n => !n.lue).length;

  const markAsRead = async (notifId) => {
    setNotifications(prev => prev.map(n =>
      n.id === notifId ? { ...n, lue: true } : n
    ));
    // Optionnel : mettre à jour en base de données
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {nonLues > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute top-12 right-0 w-80 max-h-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            <button onClick={() => setOuvert(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contenu */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${
                    n.lue ? "" : "bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.lue && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 line-clamp-2">{n.titre}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.created_date).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}