import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { adminApi } from "@/components/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2, Search, Wallet, DollarSign, AlertCircle, CheckCircle2, XCircle, Eye, UserCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

const ONGLETS = [
  { key: "liste", label: "Vendeurs" },
  { key: "kyc", label: "Validation KYC" },
  { key: "commissions", label: "Commissions" },
  { key: "paiements", label: "Paiements" },
];

const initVendeur = {
  nom_complet: "", email: "", telephone: "", ville: "", quartier: "", mot_de_passe: "",
  numero_mobile_money: "", operateur_mobile_money: "orange_money",
  taux_commission: 0, statut: "actif", date_embauche: new Date().toISOString().split("T")[0],
};

const formater = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} FCFA`;
const formaterDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Sous-composant : Liste Vendeurs ────────────────────────────────────────
function ListeVendeurs() {
  const [recherche, setRecherche] = useState("");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [vendeurEdite, setVendeurEdite] = useState(null);
  const [form, setForm] = useState(initVendeur);
  const [enCours, setEnCours] = useState(false);
  const [dialogRoleOuvert, setDialogRoleOuvert] = useState(false);
  const [vendeurRoleEdite, setVendeurRoleEdite] = useState(null);
  const [nouveauRoleVendeur, setNouveauRoleVendeur] = useState("user");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: vendeurs = [], isLoading } = useQuery({
    queryKey: ["vendeurs"],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAllVendeurs', {});
      return res.data;
    },
  });

  const modifier = (champ, valeur) => {
    setForm((p) => ({ ...p, [champ]: valeur }));
  };

  const ouvrir = (vendeur) => {
    if (vendeur) { setVendeurEdite(vendeur); setForm({ ...initVendeur, ...vendeur }); }
    else { setVendeurEdite(null); setForm(initVendeur); }
    setDialogOuvert(true);
  };

  const sauvegarder = async () => {
    if (!vendeurEdite) return;
    setEnCours(true);
    try {
      await adminApi.updateVendeur(vendeurEdite.id, { nom_complet: form.nom_complet, telephone: form.telephone, statut: form.statut, date_embauche: form.date_embauche });
      await adminApi.createJournalAudit({ action: "Vendeur modifié", module: "vendeur", details: `Vendeur ${form.nom_complet} modifié`, entite_id: vendeurEdite.id });
      toast({ title: "Vendeur modifié avec succès", duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
      setDialogOuvert(false);
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive", duration: 5000 });
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async (vendeur) => {
    if (!confirm(`Supprimer le vendeur "${vendeur.nom_complet}" ? Cette action supprimera aussi son compte utilisateur et toutes ses données.`)) return;
    try {
      await base44.functions.invoke('deleteSellerComplete', {
        seller_id: vendeur.id,
        seller_email: vendeur.email
      });
      toast({ title: "Vendeur supprimé avec succès", description: "Toutes les données ont été supprimées", duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive", duration: 5000 });
    }
  };

  const changerRole = async () => {
    if (!vendeurRoleEdite) return;
    setEnCours(true);
    try {
      // Utiliser le vendeur_id déjà disponible (user_id du seller)
      await base44.functions.invoke('changeUserRole', {
        user_email: vendeurRoleEdite.email,
        new_role: nouveauRoleVendeur
      });
      await adminApi.createJournalAudit({ action: "Rôle utilisateur changé", module: "vendeur", details: `Rôle de ${vendeurRoleEdite.nom_complet} changé en ${nouveauRoleVendeur}`, entite_id: vendeurRoleEdite.id });
      toast({ title: "Rôle changé avec succès", duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
      setDialogRoleOuvert(false);
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive", duration: 5000 });
    } finally {
      setEnCours(false);
    }
  };

  const vendeursFiltres = vendeurs.filter((v) => `${v.nom_complet} ${v.email} ${v.telephone}`.toLowerCase().includes(recherche.toLowerCase()));

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher un vendeur..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="pl-9" />
        </div>

      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Vendeur</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">CA Généré</TableHead>
                <TableHead className="text-right">Solde Commission</TableHead>
                <TableHead className="text-center">Ventes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendeursFiltres.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Aucun vendeur</TableCell></TableRow>
              )}
              {vendeursFiltres.map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{v.nom_complet?.[0]?.toUpperCase() || "V"}</div>
                      <div>
                        <p className="font-medium">{v.nom_complet}</p>
                        <p className="text-xs text-slate-500">{v.date_embauche ? new Date(v.date_embauche).toLocaleDateString("fr-FR") : ""}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm"><p>{v.email || "—"}</p><p className="text-slate-500">{v.telephone || "—"}</p></TableCell>
                  <TableCell className="text-right font-medium">{formater(v.chiffre_affaires_genere)}</TableCell>
                  <TableCell className="text-right font-bold text-yellow-600">{formater(v.solde_commission)}</TableCell>
                  <TableCell className="text-center">{v.nombre_ventes || 0}</TableCell>
                  <TableCell>
                    <Badge className={v.statut === "actif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{v.statut === "actif" ? "Actif" : "Inactif"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => ouvrir(v)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setVendeurRoleEdite(v); setNouveauRoleVendeur("user"); setDialogRoleOuvert(true); }}><UserCog className="w-4 h-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => supprimer(v)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog Modifier Vendeur */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier le Vendeur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom Complet *</Label><Input value={form.nom_complet} onChange={(e) => modifier("nom_complet", e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} disabled /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => modifier("telephone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Date d'Embauche</Label><Input type="date" value={form.date_embauche} onChange={(e) => modifier("date_embauche", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={enCours || !form.nom_complet} className="bg-[#1a1f5e] hover:bg-[#141952]">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Changement Rôle */}
      <Dialog open={dialogRoleOuvert} onOpenChange={setDialogRoleOuvert}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier le rôle - {vendeurRoleEdite?.nom_complet}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">Rôle actuel: <span className="font-bold">{vendeurRoleEdite?.role || 'user'}</span></p>
              <Label>Nouveau rôle</Label>
              <Select value={nouveauRoleVendeur} onValueChange={setNouveauRoleVendeur}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Vendeur (user)</SelectItem>
                  <SelectItem value="admin">Administrateur (admin)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">Cela changera le rôle de l'utilisateur correspondant dans le système.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDialogRoleOuvert(false)}>Annuler</Button>
            <Button onClick={changerRole} disabled={enCours} className="bg-blue-600 hover:bg-blue-700">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Changer le rôle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sous-composant : Validation KYC ────────────────────────────────────────
function ValidationKYC() {
   const [compteSelectionne, setCompteSelectionne] = useState(null);
   const [notes, setNotes] = useState("");
   const [enCours, setEnCours] = useState(false);
   const queryClient = useQueryClient();
   const { toast } = useToast();

   const { data: sellers = [], isLoading } = useQuery({
      queryKey: ["sellers"],
      queryFn: async () => {
        const res = await base44.functions.invoke('getAllVendeurs', {});
        return res.data;
      },
      refetchInterval: 30000,
    });

  const validerKYC = async (statut) => {
     setEnCours(true);
     try {
       const response = await base44.functions.invoke('validateKYC', {
         seller_id: compteSelectionne.id,
         statut,
         notes: notes || '',
       });
       if (response.data.success) {
         toast({ 
           title: statut === "valide" ? "KYC Validé" : "KYC Rejeté", 
           description: statut === "valide" ? `${compteSelectionne.nom_complet} a reçu ses identifiants.` : `${compteSelectionne.nom_complet} a été notifié du rejet.`,
           duration: 5000 
         });
       } else {
         throw new Error(response.data.error);
       }
       queryClient.invalidateQueries({ queryKey: ["sellers"] });
       setCompteSelectionne(null);
     } catch (error) {
       toast({ title: "Erreur", description: error.message, variant: "destructive", duration: 5000 });
     } finally {
       setEnCours(false);
     }
   }

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  const enAttente = sellers.filter(s => s.statut_kyc === "en_attente");
  const traites = sellers.filter(s => s.statut_kyc !== "en_attente");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En attente", val: enAttente.length, couleur: "text-yellow-600" },
          { label: "Validés", val: sellers.filter(s => s.statut_kyc === "valide").length, couleur: "text-emerald-600" },
          { label: "Rejetés", val: sellers.filter(s => s.statut_kyc === "rejete").length, couleur: "text-red-600" },
        ].map(({ label, val, couleur }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={`text-2xl font-bold ${couleur}`}>{val}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
      {enAttente.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-yellow-50 border-yellow-100"><h3 className="font-semibold text-slate-900">Dossiers KYC à valider ({enAttente.length})</h3></div>
          <div className="divide-y divide-slate-100">
            {enAttente.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><span className="text-blue-700 font-bold text-sm">{s.nom_complet?.[0]?.toUpperCase()}</span></div>
                    <div>
                      <p className="font-medium text-slate-900">{s.nom_complet}</p>
                      <p className="text-sm text-slate-500">{s.ville}{s.quartier ? `, ${s.quartier}` : ""}</p>
                      <p className="text-xs text-slate-400">{s.email}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setCompteSelectionne(s); setNotes(""); }}><Eye className="w-4 h-4 mr-1" /> Voir</Button>
                </div>
              ))}
          </div>
        </div>
      )}
      {traites.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Dossiers traités ({traites.length})</h3></div>
          <div className="divide-y divide-slate-100">
            {traites.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-slate-900">{s.nom_complet}</p><p className="text-sm text-slate-500">{s.ville} • {s.telephone}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 ${s.statut_kyc === "valide" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{s.statut_kyc === "valide" ? "Validé" : "Rejeté"}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setCompteSelectionne(s); setNotes(s.notes_admin || ""); }}><Eye className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      <Dialog open={!!compteSelectionne} onOpenChange={() => setCompteSelectionne(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Dossier KYC : {compteSelectionne?.nom_complet}</DialogTitle></DialogHeader>
          {compteSelectionne && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-400">Email</p><p className="font-medium">{compteSelectionne.email}</p></div>
                <div><p className="text-slate-400">Téléphone</p><p className="font-medium">{compteSelectionne.telephone}</p></div>
                <div><p className="text-slate-400">Ville</p><p className="font-medium">{compteSelectionne.ville}</p></div>
                <div><p className="text-slate-400">Quartier</p><p className="font-medium">{compteSelectionne.quartier || "—"}</p></div>
                <div><p className="text-slate-400">Mobile Money</p><p className="font-medium">{compteSelectionne.numero_mobile_money}</p></div>
                <div><p className="text-slate-400">Opérateur</p><p className="font-medium">{compteSelectionne.operateur_mobile_money === "orange_money" ? "Orange Money" : "MTN MoMo"}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {compteSelectionne.photo_identite_url && (
                  <div><p className="text-xs text-slate-400 mb-1">Pièce d'identité</p><img src={compteSelectionne.photo_identite_url} alt="ID" className="w-full rounded-lg object-cover h-32 cursor-pointer" onClick={() => window.open(compteSelectionne.photo_identite_url)} /></div>
                )}
                {compteSelectionne.selfie_url && (
                  <div><p className="text-xs text-slate-400 mb-1">Selfie</p><img src={compteSelectionne.selfie_url} alt="Selfie" className="w-full rounded-lg object-cover h-32 cursor-pointer" onClick={() => window.open(compteSelectionne.selfie_url)} /></div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-500">Notes (motif si rejet)</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ex : Photo illisible, selfie non conforme..." />
              </div>
            </div>
          )}
          {compteSelectionne?.statut_kyc === "en_attente" && (
             <DialogFooter className="flex gap-2">
               <Button variant="destructive" onClick={() => validerKYC("rejete")} disabled={enCours}><XCircle className="w-4 h-4 mr-1" /> Rejeter</Button>
               <Button onClick={() => validerKYC("valide")} disabled={enCours} className="bg-emerald-600 hover:bg-emerald-700">
                 {enCours ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                 Valider le KYC
               </Button>
             </DialogFooter>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sous-composant : Commissions ────────────────────────────────────────────
function CommissionsTab() {
  const [dialogPaiement, setDialogPaiement] = useState(false);
  const [vendeurPaiement, setVendeurPaiement] = useState(null);
  const [montantPaiement, setMontantPaiement] = useState(0);
  const [methodePaiement, setMethodePaiement] = useState("especes");
  const [notesPaiement, setNotesPaiement] = useState("");
  const [enCours, setEnCours] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendeurs = [], isLoading: chargementVendeurs } = useQuery({ 
    queryKey: ["vendeurs"], 
    queryFn: async () => {
      const res = await base44.functions.invoke('getAllVendeurs', {});
      return res.data;
    }
  });
  const { data: paiements = [], isLoading: chargementPaiements } = useQuery({ queryKey: ["paiements_commissions"], queryFn: () => base44.entities.PaiementCommission.list("-created_date", 100) });

  const ouvrirPaiement = (vendeur) => { setVendeurPaiement(vendeur); setMontantPaiement(vendeur.solde_commission || 0); setMethodePaiement("especes"); setNotesPaiement(""); setDialogPaiement(true); };

  const payerCommission = async () => {
    if (!vendeurPaiement || montantPaiement <= 0) return;
    setEnCours(true);
    await adminApi.createPaiementCommission({ vendeur_id: vendeurPaiement.id, vendeur_nom: vendeurPaiement.nom_complet, montant: montantPaiement, methode_paiement: methodePaiement, notes: notesPaiement });
    await adminApi.updateVendeur(vendeurPaiement.id, { solde_commission: Math.max(0, (vendeurPaiement.solde_commission || 0) - montantPaiement), total_commissions_payees: (vendeurPaiement.total_commissions_payees || 0) + montantPaiement });
    await adminApi.createJournalAudit({ action: "Commission payée", module: "paiement", details: `Paiement de ${montantPaiement} FCFA à ${vendeurPaiement.nom_complet}`, entite_id: vendeurPaiement.id });
    queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
    queryClient.invalidateQueries({ queryKey: ["paiements_commissions"] });
    setDialogPaiement(false);
    setEnCours(false);
  };

  const totalAPayer = vendeurs.reduce((s, v) => s + (v.solde_commission || 0), 0);

  if (chargementVendeurs || chargementPaiements) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total à Payer", val: totalAPayer, icon: Wallet, bg: "bg-yellow-50", color: "text-yellow-600" },
          { label: "Total Payé", val: vendeurs.reduce((s, v) => s + (v.total_commissions_payees || 0), 0), icon: DollarSign, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Total Gagné", val: vendeurs.reduce((s, v) => s + (v.total_commissions_gagnees || 0), 0), icon: DollarSign, bg: "bg-blue-50", color: "text-blue-600" },
        ].map(({ label, val, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
            <div className={`p-3 rounded-xl ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900">{formater(val)}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200"><h3 className="font-semibold text-slate-900">Soldes des Vendeurs</h3></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Vendeur</TableHead><TableHead className="text-right">Gagné</TableHead><TableHead className="text-right">Payé</TableHead><TableHead className="text-right">Solde à Payer</TableHead><TableHead className="w-32">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {vendeurs.filter(v => v.statut === "actif").map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{v.nom_complet}</TableCell>
                  <TableCell className="text-right text-sm">{formater(v.total_commissions_gagnees)}</TableCell>
                  <TableCell className="text-right text-sm">{formater(v.total_commissions_payees)}</TableCell>
                  <TableCell className="text-right"><span className={`font-bold ${(v.solde_commission || 0) > 0 ? "text-yellow-600" : "text-emerald-600"}`}>{formater(v.solde_commission)}</span></TableCell>
                  <TableCell><Button size="sm" disabled={(v.solde_commission || 0) <= 0} onClick={() => ouvrirPaiement(v)} className="bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">Payer</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200"><h3 className="font-semibold text-slate-900">Historique des Paiements</h3></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Date</TableHead><TableHead>Vendeur</TableHead><TableHead className="text-right">Montant</TableHead><TableHead>Méthode</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {paiements.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-400">Aucun paiement enregistré</TableCell></TableRow>}
              {paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{formaterDate(p.created_date)}</TableCell>
                  <TableCell className="font-medium">{p.vendeur_nom}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formater(p.montant)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{p.methode_paiement?.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-slate-500">{p.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={dialogPaiement} onOpenChange={setDialogPaiement}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Payer la Commission</DialogTitle></DialogHeader>
          {vendeurPaiement && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Vendeur: <span className="font-bold text-slate-900">{vendeurPaiement.nom_complet}</span></p>
                <p className="text-sm text-slate-600">Solde actuel: <span className="font-bold text-yellow-600">{formater(vendeurPaiement.solde_commission)}</span></p>
              </div>
              <div className="space-y-2">
                <Label>Montant à Payer (FCFA)</Label>
                <Input type="number" min="0" max={vendeurPaiement.solde_commission || 0} value={montantPaiement} onChange={(e) => setMontantPaiement(parseFloat(e.target.value) || 0)} />
                {montantPaiement > (vendeurPaiement.solde_commission || 0) && <div className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="w-3 h-3" /> Le montant dépasse le solde</div>}
              </div>
              <div className="space-y-2">
                <Label>Méthode de Paiement</Label>
                <Select value={methodePaiement} onValueChange={setMethodePaiement}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input value={notesPaiement} onChange={(e) => setNotesPaiement(e.target.value)} placeholder="Notes optionnelles..." /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPaiement(false)}>Annuler</Button>
            <Button onClick={payerCommission} disabled={enCours || montantPaiement <= 0 || montantPaiement > (vendeurPaiement?.solde_commission || 0)} className="bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer le Paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sous-composant : Paiements Vendeurs ────────────────────────────────────
function PaiementsTab() {
  const queryClient = useQueryClient();
  const { data: demandes = [], isLoading } = useQuery({ queryKey: ["demandes_paiement_admin"], queryFn: () => base44.entities.DemandePaiementVendeur.list("-created_date") });

  const marquerPaye = async (demande) => {
    // Opération atomique via adminApi (service role) : met à jour demande + solde vendeur + notif
    await adminApi.marquerDemandePaye(demande.id);
    queryClient.invalidateQueries({ queryKey: ["demandes_paiement_admin"] });
    queryClient.invalidateQueries({ queryKey: ["paiements_badge"] });
    queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
  };

  if (isLoading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  const enAttente = demandes.filter(d => d.statut === "en_attente");
  const traitees = demandes.filter(d => d.statut !== "en_attente");
  const totalEnAttente = enAttente.reduce((s, d) => s + (d.montant || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 bg-yellow-50 rounded-xl"><Wallet className="w-5 h-5 text-yellow-600" /></div>
          <div><p className="text-sm text-slate-500">À payer maintenant</p><p className="text-xl font-bold text-yellow-600">{formater(totalEnAttente)}</p><p className="text-xs text-slate-400">{enAttente.length} demande{enAttente.length > 1 ? "s" : ""}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-sm text-slate-500">Total payé</p><p className="text-xl font-bold text-emerald-600">{formater(traitees.filter(d => d.statut === "paye").reduce((s, d) => s + d.montant, 0))}</p></div>
        </div>
      </div>
      {enAttente.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-yellow-50 border-yellow-100"><h3 className="font-semibold text-slate-900">Demandes à traiter ({enAttente.length})</h3></div>
          <div className="divide-y divide-slate-100">
            {enAttente.map(d => (
              <div key={d.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{formater(d.montant)}</p>
                  <p className="text-sm text-slate-700 font-medium">{d.vendeur_nom}</p>
                  <p className="text-xs text-slate-500">{d.operateur} : {d.numero_mobile_money}</p>
                  <p className="text-xs text-slate-400">{formaterDate(d.created_date)}</p>
                </div>
                <Button size="sm" onClick={() => marquerPaye(d)} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-1" /> Payé</Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {traitees.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Historique ({traitees.length})</h3></div>
          <div className="divide-y divide-slate-100">
            {traitees.map(d => (
              <div key={d.id} className="p-4 flex items-center justify-between">
                <div><p className="font-bold">{formater(d.montant)}</p><p className="text-sm text-slate-600">{d.vendeur_nom} • {d.operateur}</p><p className="text-xs text-slate-400">{formaterDate(d.created_date)}</p></div>
                <Badge className={`border-0 ${d.statut === "paye" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{d.statut === "paye" ? "Payé ✓" : "Rejeté"}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {demandes.length === 0 && <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">Aucune demande de paiement</div>}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function Vendeurs() {
  const [ongletActif, setOngletActif] = useState("liste");

  const { data: kycs = [] } = useQuery({ 
    queryKey: ["sellers_badge"], 
    queryFn: async () => {
      const res = await base44.functions.invoke('getAllVendeurs', {});
      return (res.data || []).filter(s => s.statut_kyc === "en_attente");
    }, 
    refetchInterval: 30000 
  });
  const { data: paiements = [] } = useQuery({ queryKey: ["paiements_badge"], queryFn: () => base44.entities.DemandePaiementVendeur.filter({ statut: "en_attente" }), refetchInterval: 30000 });

  const badges = { kyc: kycs.length, paiements: paiements.length };

  return (
    <div className="space-y-5">
      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {ONGLETS.map(({ key, label }) => {
          const badge = badges[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setOngletActif(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${ongletActif === key ? "border-[#1a1f5e] text-[#1a1f5e]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {label}
              {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
            </button>
          );
        })}
      </div>

      {ongletActif === "liste" && <ListeVendeurs />}
      {ongletActif === "kyc" && <ValidationKYC />}
      {ongletActif === "commissions" && <CommissionsTab />}
      {ongletActif === "paiements" && <PaiementsTab />}
    </div>
  );
}