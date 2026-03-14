import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { vendeurApi } from "@/components/vendeurApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, HelpCircle, MessageSquare, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, Loader2, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";



const STATUTS = {
  ouvert: { label: "Ouvert", color: "bg-blue-100 text-blue-700" },
  en_cours: { label: "En cours", color: "bg-yellow-100 text-yellow-700" },
  resolu: { label: "Résolu", color: "bg-green-100 text-green-700" },
  ferme: { label: "Fermé", color: "bg-slate-100 text-slate-600" }
};

const CATEGORIES = [
  { value: "commande", label: "Commande" },
  { value: "paiement", label: "Paiement / Commission" },
  { value: "produit", label: "Produit" },
  { value: "compte", label: "Compte" },
  { value: "livraison", label: "Livraison" },
  { value: "autre", label: "Autre" }
];

export default function AideVendeur() {
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [onglet, setOnglet] = useState("faq");
  const [faqOuverte, setFaqOuverte] = useState(null);

  const { data: faqItems = [] } = useQuery({
    queryKey: ["faq_items"],
    queryFn: () => base44.entities.FaqItem.filter({ actif: true }, "ordre"),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sujet: "", categorie: "", message: "" });
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [ticketOuvert, setTicketOuvert] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const charger = async () => {
      const u = await base44.auth.me();
      const sellers = await base44.entities.Seller.filter({ email: u.email });
      if (sellers.length > 0) setCompteVendeur(sellers[0]);
    };
    charger();
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets_vendeur", compteVendeur?.email],
    queryFn: () => base44.entities.TicketSupport.filter({ vendeur_email: compteVendeur.email }, "-created_date"),
    enabled: !!compteVendeur,
  });

  const soumettre = async () => {
    if (!form.sujet || !form.categorie || !form.message) return;
    setEnCours(true);
    await vendeurApi.createTicketSupport({
      vendeur_email: compteVendeur.email,
      vendeur_nom: compteVendeur.nom_complet,
      sujet: form.sujet,
      categorie: form.categorie,
      message: form.message,
      statut: "ouvert",
      priorite: "normale"
    });
    queryClient.invalidateQueries({ queryKey: ["tickets_vendeur"] });
    setForm({ sujet: "", categorie: "", message: "" });
    setShowForm(false);
    setSucces(true);
    setOnglet("tickets");
    setEnCours(false);
    setTimeout(() => setSucces(false), 4000);
  };

  // Marquer comme lu quand le vendeur ouvre un ticket avec réponse
  const ouvrirTicket = async (ticket) => {
    setTicketOuvert(ticket);
    if (ticket.reponse_admin && !ticket.lu_par_vendeur) {
      await vendeurApi.marquerTicketLu(ticket.id);
      queryClient.invalidateQueries({ queryKey: ["tickets_vendeur"] });
    }
  };

  const nbNonLus = tickets.filter(t => t.reponse_admin && !t.lu_par_vendeur).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-[#1a1f5e] text-white px-4 pb-4" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("EspaceVendeur")}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Aide & Support</h1>
            <p className="text-xs text-white/60">FAQ et tickets de support</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mt-4">
          <button onClick={() => setOnglet("faq")}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${onglet === "faq" ? "bg-white text-[#1a1f5e]" : "text-white/70 hover:bg-white/10"}`}>
            <HelpCircle className="w-4 h-4 inline mr-1" />FAQ
          </button>
          <button onClick={() => setOnglet("tickets")}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors relative ${onglet === "tickets" ? "bg-white text-[#1a1f5e]" : "text-white/70 hover:bg-white/10"}`}>
            <MessageSquare className="w-4 h-4 inline mr-1" />Mes Tickets
            {nbNonLus > 0 && (
              <span className="absolute top-1 right-4 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {nbNonLus}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {succes && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Ticket envoyé ! L'équipe ZONITE vous répondra bientôt.
          </div>
        )}

        {/* FAQ */}
        {onglet === "faq" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide px-1">Questions fréquentes</p>
            {faqItems.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">Aucune question disponible pour l'instant.</div>
            )}
            {faqItems.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setFaqOuverte(faqOuverte === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                >
                  <span className="text-sm font-medium text-slate-900">{item.question}</span>
                  {faqOuverte === i
                    ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  }
                </button>
                {faqOuverte === i && (
                  <div className="px-4 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
                    {item.reponse}
                  </div>
                )}
              </div>
            ))}

            <div className="bg-[#1a1f5e]/5 border border-[#1a1f5e]/10 rounded-2xl p-4 text-center mt-4">
              <p className="text-sm text-slate-700 font-medium mb-1">Vous n'avez pas trouvé votre réponse ?</p>
              <p className="text-xs text-slate-500 mb-3">Ouvrez un ticket, notre équipe vous répondra rapidement.</p>
              <Button onClick={() => { setOnglet("tickets"); setShowForm(true); }}
                className="bg-[#1a1f5e] hover:bg-[#141952] text-white text-sm">
                <Plus className="w-4 h-4 mr-1" /> Ouvrir un ticket
              </Button>
            </div>
          </div>
        )}

        {/* Tickets */}
        {onglet === "tickets" && (
          <div className="space-y-3">
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="w-full bg-[#1a1f5e] hover:bg-[#141952] text-white">
                <Plus className="w-4 h-4 mr-2" /> Nouveau ticket
              </Button>
            )}

            {/* Formulaire nouveau ticket */}
            {showForm && (
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm">Nouveau ticket</h3>
                  <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                </div>
                <div className="space-y-1">
                  <Label>Catégorie *</Label>
                  <Select value={form.categorie} onValueChange={v => setForm(f => ({ ...f, categorie: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Sujet *</Label>
                  <Input value={form.sujet} onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))} placeholder="Décrivez brièvement votre problème" />
                </div>
                <div className="space-y-1">
                  <Label>Message *</Label>
                  <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder="Décrivez votre problème en détail..." />
                </div>
                <Button onClick={soumettre} disabled={enCours || !form.sujet || !form.categorie || !form.message} className="w-full bg-[#1a1f5e] hover:bg-[#141952]">
                  {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer le ticket"}
                </Button>
              </div>
            )}

            {/* Liste des tickets */}
            {tickets.length === 0 && !showForm ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun ticket pour l'instant</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div key={ticket.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button className="w-full text-left px-4 py-3.5" onClick={() => ouvrirTicket(ticketOuvert?.id === ticket.id ? null : ticket)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUTS[ticket.statut]?.color}`}>
                            {STATUTS[ticket.statut]?.label}
                          </span>
                          {ticket.reponse_admin && !ticket.lu_par_vendeur && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Nouvelle réponse</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate">{ticket.sujet}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(new Date(ticket.created_date), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      {ticketOuvert?.id === ticket.id ? <ChevronUp className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />}
                    </div>
                  </button>

                  {ticketOuvert?.id === ticket.id && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500 font-medium mb-1">Votre message</p>
                        <p className="text-sm text-slate-700">{ticket.message}</p>
                      </div>
                      {ticket.reponse_admin ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          <p className="text-xs text-emerald-600 font-medium mb-1">Réponse de l'équipe ZONITE</p>
                          <p className="text-sm text-slate-700">{ticket.reponse_admin}</p>
                          {ticket.date_reponse && (
                            <p className="text-xs text-slate-400 mt-1">{format(new Date(ticket.date_reponse), "d MMM yyyy à HH:mm", { locale: fr })}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          En attente de réponse de l'équipe ZONITE
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex bottom-nav-safe z-50">
        {[
          { to: "EspaceVendeur", label: "Accueil", icon: "🏠" },
          { to: "MesCommandesVendeur", label: "Commandes", icon: "📦" },
          { to: "CatalogueVendeur", label: "Catalogue", icon: "🛍️" },
          { to: "ProfilVendeur", label: "Profil", icon: "👤" },
        ].map(item => (
          <Link key={item.to} to={createPageUrl(item.to)} className="flex-1 flex flex-col items-center py-2 text-slate-400 hover:text-[#1a1f5e] transition-colors">
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}