import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Play, CheckCircle2, AlertTriangle, XCircle, Ghost, UserX, FileQuestion
} from "lucide-react";

export default function AuditComptes() {
  const [rapport, setRapport] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [autoFix, setAutoFix] = useState(true);

  const lancerAudit = async () => {
    setEnCours(true);
    try {
      const response = await base44.functions.invoke('auditGhostAccounts', { autoFix });
      setRapport(response.data.report);
    } catch (error) {
      console.error('Erreur audit:', error);
      alert('Erreur lors de l\'audit: ' + error.message);
    } finally {
      setEnCours(false);
    }
  };

  const getBadgeStatus = (status) => {
    switch (status) {
      case 'perfect':
        return { label: 'Parfait ✓', classe: 'bg-emerald-500 text-white' };
      case 'corrected':
        return { label: 'Corrigé ✓', classe: 'bg-blue-500 text-white' };
      case 'needs_attention':
        return { label: 'Attention requise', classe: 'bg-orange-500 text-white' };
      default:
        return { label: 'Inconnu', classe: 'bg-slate-500 text-white' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-[#1a1f5e]" />
            Audit Comptes & Synchronisation
          </h1>
          <p className="text-slate-500 mt-1">
            Détection et correction des comptes fantômes (Base44 ↔ Application)
          </p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={autoFix}
              onChange={(e) => setAutoFix(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-slate-700">Auto-correction</span>
          </label>
          <Button
            onClick={lancerAudit}
            disabled={enCours}
            className="bg-[#1a1f5e] hover:bg-[#141952]"
          >
            {enCours ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Audit en cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Lancer l'audit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Résumé */}
      {rapport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="border-2 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-3xl font-bold text-slate-900">{rapport.summary.totalUsers}</p>
                  <p className="text-sm text-slate-500">Users Base44</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
                  <p className="text-3xl font-bold text-slate-900">{rapport.summary.totalSellers}</p>
                  <p className="text-sm text-slate-500">Sellers App</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Ghost className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-3xl font-bold text-purple-600">{rapport.summary.ghostAccountsFound}</p>
                  <p className="text-sm text-slate-500">Comptes fantômes</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <UserX className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <p className="text-3xl font-bold text-orange-600">{rapport.summary.orphanAccountsFound}</p>
                  <p className="text-sm text-slate-500">Comptes orphelins</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                  <p className="text-3xl font-bold text-emerald-600">{rapport.summary.accountsFixed}</p>
                  <p className="text-sm text-slate-500">Comptes corrigés</p>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${rapport.status === 'perfect' || rapport.status === 'corrected' ? 'border-emerald-500 bg-emerald-50' : 'border-orange-500 bg-orange-50'}`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className={`w-8 h-8 mx-auto mb-2 ${rapport.status === 'perfect' || rapport.status === 'corrected' ? 'text-emerald-600' : 'text-orange-600'}`} />
                  <Badge className={getBadgeStatus(rapport.status).classe}>
                    {getBadgeStatus(rapport.status).label}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">Synchronisation</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comptes fantômes */}
          {rapport.ghostAccounts.length > 0 && (
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ghost className="w-5 h-5 text-purple-600" />
                  Comptes Fantômes ({rapport.ghostAccounts.length})
                  <Badge className="bg-purple-100 text-purple-800">
                    Base44 ✓ | App ✗
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3">
                  Utilisateurs existants dans Base44 mais absents de la base de données application.
                </p>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {rapport.ghostAccounts.map((ghost, i) => (
                      <div key={i} className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{ghost.full_name}</p>
                            <p className="text-xs text-slate-500">{ghost.email}</p>
                            <p className="text-xs text-purple-700 mt-1">{ghost.issue}</p>
                          </div>
                          <Badge className="bg-white/50 text-purple-800">
                            {new Date(ghost.created_date).toLocaleDateString('fr-FR')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Comptes orphelins */}
          {rapport.orphanAccounts.length > 0 && (
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-orange-600" />
                  Comptes Orphelins ({rapport.orphanAccounts.length})
                  <Badge className="bg-orange-100 text-orange-800">
                    Base44 ✗ | App ✓
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3">
                  Sellers existants dans l'application mais absents de Base44 (authentification impossible).
                </p>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {rapport.orphanAccounts.map((orphan, i) => (
                      <div key={i} className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{orphan.nom_complet}</p>
                            <p className="text-xs text-slate-500">{orphan.email}</p>
                            <p className="text-xs text-orange-700 mt-1">{orphan.issue}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-white/50 text-orange-800">
                              {orphan.statut_kyc}
                            </Badge>
                            <p className="text-xs text-slate-500 mt-1">ID: {orphan.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* KYC manquants */}
          {rapport.missingKYC.length > 0 && (
            <Card className="border-2 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-yellow-600" />
                  Problèmes KYC ({rapport.missingKYC.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {rapport.missingKYC.map((kyc, i) => (
                      <div key={i} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{kyc.nom_complet}</p>
                            <p className="text-xs text-slate-500">{kyc.email}</p>
                            <p className="text-xs text-yellow-700 mt-1">{kyc.issue}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Corrections */}
          {rapport.corrections.length > 0 && (
            <Card className="border-2 border-emerald-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Corrections Appliquées ({rapport.corrections.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  <div className="space-y-1">
                    {rapport.corrections.map((correction, i) => (
                      <div key={i} className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 inline mr-2" />
                        {correction}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* État parfait */}
          {rapport.status === 'perfect' && (
            <Card className="border-2 border-emerald-500 bg-emerald-50">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
                <h3 className="text-lg font-semibold text-emerald-900 mb-2">
                  Synchronisation Parfaite ✓
                </h3>
                <p className="text-sm text-emerald-700">
                  Aucun compte fantôme ou orphelin détecté. Base44 et Application sont parfaitement synchronisés.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recommandations */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Recommandations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-800">
                {rapport.summary.ghostAccountsFound > 0 && autoFix && (
                  <p>✅ <strong>{rapport.summary.accountsFixed} comptes fantômes</strong> ont été automatiquement créés dans l'application.</p>
                )}
                {rapport.summary.orphanAccountsFound > 0 && (
                  <p>⚠️ <strong>{rapport.summary.orphanAccountsFound} comptes orphelins</strong> nécessitent une action manuelle (suppression ou réinscription).</p>
                )}
                {rapport.status === 'perfect' && (
                  <p>✅ Synchronisation parfaite ! Tous les comptes sont cohérents entre Base44 et l'application.</p>
                )}
                <p>💡 Relancez cet audit quotidiennement pour maintenir la synchronisation.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* État initial */}
      {!rapport && !enCours && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Prêt pour l'audit
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Détection et correction automatique des comptes fantômes et orphelins
            </p>
            <ul className="text-xs text-slate-600 text-left max-w-md mx-auto space-y-1">
              <li>✓ Vérification synchronisation Base44 ↔ Application</li>
              <li>✓ Détection des comptes fantômes (Base44 sans Seller app)</li>
              <li>✓ Détection des comptes orphelins (Seller app sans Base44)</li>
              <li>✓ Validation workflow KYC</li>
              <li>✓ Correction automatique des incohérences</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}