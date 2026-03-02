import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react";

const STATUTS = {
  en_attente: { label: "En attente", couleur: "bg-yellow-100 text-yellow-800" },
  approuve: { label: "Approuvé", couleur: "bg-emerald-100 text-emerald-800" },
  rejete: { label: "Rejeté", couleur: "bg-red-100 text-red-800" },
};

export default function GestionCandidatures() {
  const [candidatureSelectionnee, setCandidatureSelectionnee] = useState(null);
  const [notes, setNotes] = useState("");
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: candidatures = [], isLoading } = useQuery({
    queryKey: ["candidatures"],
    queryFn: () => base44.entities.CandidatureVendeur.list("-created_date"),
  });

  const traiter = async (statut) => {
    setEnCours(true);
    await base44.entities.CandidatureVendeur.update(candidatureSelectionnee.id, { statut, notes_admin: notes });
    if (statut === "approuve") {
      await base44.entities.NotificationVendeur.create({
        vendeur_email: candidatureSelectionnee.email,
        titre: "Candidature approuvée !",
        message: "Félicitations ! Votre candidature a été approuvée. Créez votre compte vendeur ZONITE pour commencer.",
        type: "succes",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["candidatures"] });
    setCandidatureSelectionnee(null);
    setEnCours(false);
  };

  const formaterDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  const enAttente = candidatures.filter(c => c.statut === "en_attente");
  const traitees = candidatures.filter(c => c.statut !== "en_attente");

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En attente", val: candidatures.filter(c => c.statut === "en_attente").length, couleur: "text-yellow-600" },
          { label: "Approuvées", val: candidatures.filter(c => c.statut === "approuve").length, couleur: "text-emerald-600" },
          { label: "Rejetées", val: candidatures.filter(c => c.statut === "rejete").length, couleur: "text-red-600" },
        ].map(({ label, val, couleur }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={`text-2xl font-bold ${couleur}`}>{val}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {enAttente.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-yellow-50 border-yellow-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <h3 className="font-semibold text-slate-900">À traiter ({enAttente.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {enAttente.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{c.nom_complet}</p>
                  <p className="text-sm text-slate-500">{c.ville} • {c.numero_whatsapp}</p>
                  <p className="text-xs text-slate-400">{formaterDate(c.created_date)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setCandidatureSelectionnee(c); setNotes(""); }}>
                  <Eye className="w-4 h-4 mr-1" /> Examiner
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {traitees.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Candidatures traitées ({traitees.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {traitees.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{c.nom_complet}</p>
                  <p className="text-sm text-slate-500">{c.ville} • {c.email}</p>
                </div>
                <Badge className={`${STATUTS[c.statut]?.couleur} border-0`}>{STATUTS[c.statut]?.label}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {candidatures.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Aucune candidature reçue
        </div>
      )}

      {/* Dialogue détail */}
      <Dialog open={!!candidatureSelectionnee} onOpenChange={() => setCandidatureSelectionnee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Candidature de {candidatureSelectionnee?.nom_complet}</DialogTitle>
          </DialogHeader>
          {candidatureSelectionnee && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-slate-400">Ville</p><p className="font-medium">{candidatureSelectionnee.ville}</p></div>
                <div><p className="text-slate-400">WhatsApp</p><p className="font-medium">{candidatureSelectionnee.numero_whatsapp}</p></div>
                <div><p className="text-slate-400">Email</p><p className="font-medium">{candidatureSelectionnee.email}</p></div>
              </div>
              {candidatureSelectionnee.experience_vente && (
                <div><p className="text-slate-400">Expérience</p><p className="font-medium">{candidatureSelectionnee.experience_vente}</p></div>
              )}
              {candidatureSelectionnee.motivation && (
                <div><p className="text-slate-400">Motivation</p><p className="text-slate-700 bg-slate-50 rounded-lg p-2">{candidatureSelectionnee.motivation}</p></div>
              )}
              <div className="space-y-1">
                <label className="text-slate-400">Notes admin</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Raison de la décision..." />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="destructive" onClick={() => traiter("rejete")} disabled={enCours}>
              <XCircle className="w-4 h-4 mr-1" /> Rejeter
            </Button>
            <Button onClick={() => traiter("approuve")} disabled={enCours} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}