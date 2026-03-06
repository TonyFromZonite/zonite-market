import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Loader2, Search, User, AlertCircle, HelpCircle, Plus, Pencil, Trash2, X, Check, GripVertical, Bell, Star, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUTS = {
  ouvert: { label: "Ouvert", color: "bg-blue-100 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  resolu: { label: "Résolu", color: "bg-green-100 text-green-700 border-green-200" },
  ferme: { label: "Fermé", color: "bg-slate-100 text-slate-600 border-slate-200" }
};

const CATEGORIES = {
  commande: "Commande", paiement: "Paiement", produit: "Produit",
  compte: "Compte", livraison: "Livraison", autre: "Autre"
};

const PRIORITES = {
  basse: { label: "Basse", color: "text-slate-500" },
  normale: { label: "Normale", color: "text-blue-600" },
  haute: { label: "Haute", color: "text-orange-600" },
  urgente: { label: "Urgente", color: "text-red-600" }
};

export default function SupportAdmin() {
  const [onglet, setOnglet] = useState("tickets");
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [ticketSelectionne, setTicketSelectionne] = useState(null);
  const [reponse, setReponse] = useState("");
  const [nouveauStatut, setNouveauStatut] = useState("");
  const [enCours, setEnCours] = useState(false);
  // FAQ state
  const [faqEdit, setFaqEdit] = useState(null);
  const [faqForm, setFaqForm] = useState({ question: "", reponse: "" });
  const [faqEnCours, setFaqEnCours] = useState(false);
  // Notifications state
  const [notifFiltreType, setNotifFiltreType] = useState("tous");
  const [notifFiltreVendeur, setNotifFiltreVendeur] = useState("");
  const queryClient = useQueryClient();

  const { data: faqItems = [], isLoading: faqLoading } = useQuery({
    queryKey: ["faq_items"],
    queryFn: () => base44.entities.FaqItem.list("ordre"),
  });

  const ouvrirFaqEdit = (item) => {
    setFaqEdit(item);
    setFaqForm({ question: item.question, reponse: item.reponse, actif: item.actif ?? true });
  };

  const nouveauFaq = () => {
    setFaqEdit("new");
    setFaqForm({ question: "", reponse: "", actif: true });
  };

  const sauvegarderFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.reponse.trim()) return;
    setFaqEnCours(true);
    if (faqEdit === "new") {
      await adminApi.createFaqItem({ ...faqForm, ordre: faqItems.length });
    } else {
      await adminApi.updateFaqItem(faqEdit.id, faqForm);
    }
    queryClient.invalidateQueries({ queryKey: ["faq_items"] });
    setFaqEdit(null);
    setFaqEnCours(false);
  };

  const supprimerFaq = async (id) => {
    if (!confirm("Supprimer cette question ?")) return;
    await adminApi.deleteFaqItem(id);
    queryClient.invalidateQueries({ queryKey: ["faq_items"] });
  };

  const toggleFaqActif = async (item) => {
    await adminApi.updateFaqItem(item.id, { actif: !item.actif });
    queryClient.invalidateQueries({ queryKey: ["faq_items"] });
  };

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets_support"],
    queryFn: () => base44.entities.TicketSupport.list("-created_date", 200),
    refetchInterval: 30000,
  });

  const ticketsFiltres = tickets.filter(t => {
    const matchStatut = filtreStatut === "tous" || t.statut === filtreStatut;
    const matchRecherche = !recherche || t.sujet?.toLowerCase().includes(recherche.toLowerCase()) || t.vendeur_nom?.toLowerCase().includes(recherche.toLowerCase());
    return matchStatut && matchRecherche;
  });

  const nbOuverts = tickets.filter(t => t.statut === "ouvert").length;

  const { data: toutesNotifs = [], isLoading: notifsLoading } = useQuery({
    queryKey: ["toutes_notifs_admin"],
    queryFn: () => base44.entities.NotificationVendeur.list("-created_date", 200),
    enabled: onglet === "notifications",
  });

  const notifsFiltrees = toutesNotifs.filter(n => {
    const matchType = notifFiltreType === "tous" || n.type === notifFiltreType;
    const matchVendeur = !notifFiltreVendeur || n.vendeur_email?.toLowerCase().includes(notifFiltreVendeur.toLowerCase());
    return matchType && matchVendeur;
  });

  const toggleImportante = async (notif) => {
    await adminApi.updateNotificationVendeur(notif.id, { importante: !notif.importante });
    queryClient.invalidateQueries({ queryKey: ["toutes_notifs_admin"] });
  };

  const marquerLueAdmin = async (notif) => {
    await adminApi.updateNotificationVendeur(notif.id, { lue: !notif.lue });
    queryClient.invalidateQueries({ queryKey: ["toutes_notifs_admin"] });
  };

  const ouvrirTicket = (ticket) => {
    setTicketSelectionne(ticket);
    setReponse(ticket.reponse_admin || "");
    setNouveauStatut(ticket.statut);
  };

  const envoyerReponse = async () => {
    if (!reponse.trim()) return;
    setEnCours(true);
    const sousAdminSession = JSON.parse(sessionStorage.getItem('sousAdminSession') || 'null');
    const adminSession = JSON.parse(sessionStorage.getItem('adminSession') || 'null');
    const adminEmail = sousAdminSession?.email || adminSession?.email || '';
    await adminApi.updateTicketSupport(ticketSelectionne.id, {
      reponse_admin: reponse,
      statut: nouveauStatut || "en_cours",
      admin_email: adminEmail,
      date_reponse: new Date().toISOString(),
      lu_par_vendeur: false,
    });

    // Notifier le vendeur
    await adminApi.createNotificationVendeur({
      vendeur_email: ticketSelectionne.vendeur_email,
      titre: "Réponse à votre ticket",
      message: `Votre ticket "${ticketSelectionne.sujet}" a reçu une réponse. Consultez votre espace Aide.`,
      type: "info",
    });

    queryClient.invalidateQueries({ queryKey: ["tickets_support"] });
    setTicketSelectionne(prev => ({ ...prev, reponse_admin: reponse, statut: nouveauStatut || "en_cours" }));
    setEnCours(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Vendeurs</h1>
          <p className="text-sm text-slate-500">Gérez les tickets et la FAQ</p>
        </div>
        {nbOuverts > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {nbOuverts} ticket{nbOuverts > 1 ? "s" : ""} ouvert{nbOuverts > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => setOnglet("tickets")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === "tickets" ? "border-[#1a1f5e] text-[#1a1f5e]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          <MessageSquare className="w-4 h-4 inline mr-1.5" />Tickets {nbOuverts > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{nbOuverts}</span>}
        </button>
        <button onClick={() => setOnglet("faq")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === "faq" ? "border-[#1a1f5e] text-[#1a1f5e]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          <HelpCircle className="w-4 h-4 inline mr-1.5" />FAQ ({faqItems.length})
        </button>
        <button onClick={() => setOnglet("notifications")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === "notifications" ? "border-[#1a1f5e] text-[#1a1f5e]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          <Bell className="w-4 h-4 inline mr-1.5" />Notifications
        </button>
      </div>

      {/* Section FAQ */}
      {onglet === "faq" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={nouveauFaq} className="bg-[#1a1f5e] hover:bg-[#141952]">
              <Plus className="w-4 h-4 mr-2" /> Ajouter une question
            </Button>
          </div>

          {faqEdit && (
            <div className="bg-white rounded-xl border border-[#1a1f5e]/20 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{faqEdit === "new" ? "Nouvelle question" : "Modifier la question"}</h3>
                <button onClick={() => setFaqEdit(null)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Question *</label>
                <Input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder="Ex: Comment passer une commande ?" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Réponse *</label>
                <Textarea value={faqForm.reponse} onChange={e => setFaqForm(f => ({ ...f, reponse: e.target.value }))} rows={4} placeholder="Rédigez la réponse..." />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={faqForm.actif} onChange={e => setFaqForm(f => ({ ...f, actif: e.target.checked }))} className="rounded" />
                  Visible par les vendeurs
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setFaqEdit(null)}>Annuler</Button>
                <Button onClick={sauvegarderFaq} disabled={faqEnCours || !faqForm.question.trim() || !faqForm.reponse.trim()} className="bg-[#1a1f5e] hover:bg-[#141952]">
                  {faqEnCours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {faqLoading ? (
            <div className="text-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : faqItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune question FAQ. Ajoutez-en une !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <div key={item.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${!item.actif ? "opacity-50" : "border-slate-200"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 mb-1">{item.question}</p>
                    <p className="text-sm text-slate-500 line-clamp-2">{item.reponse}</p>
                    {!item.actif && <span className="text-[10px] text-slate-400 italic">Masquée aux vendeurs</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleFaqActif(item)} title={item.actif ? "Masquer" : "Afficher"}
                      className={`p-1.5 rounded-lg transition-colors ${item.actif ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => ouvrirFaqEdit(item)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => supprimerFaq(item.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section Notifications Admin */}
      {onglet === "notifications" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Filtrer par email vendeur..."
                value={notifFiltreVendeur}
                onChange={e => setNotifFiltreVendeur(e.target.value)}
              />
            </div>
            <Select value={notifFiltreType} onValueChange={setNotifFiltreType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="succes">Succès</SelectItem>
                <SelectItem value="alerte">Alerte</SelectItem>
                <SelectItem value="paiement">Paiement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {notifsLoading ? (
            <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : notifsFiltrees.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifsFiltrees.map(n => (
                <div key={n.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-opacity ${n.lue ? "opacity-60" : "border-slate-200"} ${n.importante ? "border-l-4 border-l-yellow-400" : ""}`}>
                  <span className="text-xl flex-shrink-0">
                    {n.type === "succes" ? "✅" : n.type === "alerte" ? "⚠️" : n.type === "paiement" ? "💰" : "ℹ️"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{n.titre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{n.vendeur_email}</span>
                      <span className="text-[10px] text-slate-400">{new Date(n.created_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {!n.lue && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleImportante(n)} title={n.importante ? "Retirer l'importance" : "Marquer importante"}
                      className={`p-1.5 rounded-lg transition-colors ${n.importante ? "text-yellow-500 hover:bg-yellow-50" : "text-slate-300 hover:bg-slate-100"}`}>
                      <Star className="w-4 h-4" fill={n.importante ? "currentColor" : "none"} />
                    </button>
                    <button onClick={() => marquerLueAdmin(n)} title={n.lue ? "Marquer non lue" : "Marquer lue"}
                      className={`p-1.5 rounded-lg transition-colors ${n.lue ? "text-slate-400 hover:bg-slate-100" : "text-blue-600 hover:bg-blue-50"}`}>
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onglet === "tickets" && <div className="space-y-4"><div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Rechercher par vendeur ou sujet..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />
        </div>
        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous</SelectItem>
            {Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Liste des tickets */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : ticketsFiltres.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun ticket</p>
            </div>
          ) : ticketsFiltres.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => ouvrirTicket(ticket)}
              className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${ticketSelectionne?.id === ticket.id ? "border-[#1a1f5e] ring-1 ring-[#1a1f5e]/10" : "border-slate-200"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUTS[ticket.statut]?.color}`}>
                    {STATUTS[ticket.statut]?.label}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {CATEGORIES[ticket.categorie] || ticket.categorie}
                  </span>
                  {!ticket.reponse_admin && ticket.statut === "ouvert" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">Sans réponse</span>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1 line-clamp-1">{ticket.sujet}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <User className="w-3 h-3" />
                  <span>{ticket.vendeur_nom || ticket.vendeur_email}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {format(new Date(ticket.created_date), "d MMM", { locale: fr })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Détail du ticket */}
        {ticketSelectionne ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 sticky top-4 self-start">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUTS[ticketSelectionne.statut]?.color}`}>
                  {STATUTS[ticketSelectionne.statut]?.label}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {CATEGORIES[ticketSelectionne.categorie]}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">{ticketSelectionne.sujet}</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <User className="w-3 h-3" />
                <span>{ticketSelectionne.vendeur_nom} — {ticketSelectionne.vendeur_email}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {format(new Date(ticketSelectionne.created_date), "d MMMM yyyy à HH:mm", { locale: fr })}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-2">Message du vendeur</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{ticketSelectionne.message}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Votre réponse</label>
              <Textarea value={reponse} onChange={e => setReponse(e.target.value)} rows={4} placeholder="Rédigez votre réponse..." />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Statut</label>
              <Select value={nouveauStatut} onValueChange={setNouveauStatut}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={envoyerReponse} disabled={enCours || !reponse.trim()} className="w-full bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              Envoyer la réponse
            </Button>
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-12 text-slate-400">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sélectionnez un ticket</p>
            </div>
          </div>
        )}
      </div></div>}
    </div>
  );
}