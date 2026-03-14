import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Play, CheckCircle2, AlertTriangle, XCircle,
  Database, Workflow, Lock, Bell, FileText, Download
} from "lucide-react";

const ICONES_SECTION = {
  "Entités & Intégrité Base de Données": Database,
  "Workflows & Logique Métier": Workflow,
  "Permissions & Rôles": Lock,
  "Système de Notifications": Bell
};

const COULEUR_SEVERITE = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
  info: "bg-slate-100 text-slate-800 border-slate-300"
};

export default function AuditSysteme() {
  const [rapport, setRapport] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [autoCorrect, setAutoCorrect] = useState(true);

  const lancerAudit = async () => {
    setEnCours(true);
    try {
      const response = await base44.functions.invoke('fullSystemAudit', { autoCorrect });
      setRapport(response.data.report);
    } catch (error) {
      console.error('Erreur audit:', error);
      alert('Erreur lors de l\'audit: ' + error.message);
    } finally {
      setEnCours(false);
    }
  };

  const telechargerRapport = () => {
    if (!rapport) return;
    
    const blob = new Blob([JSON.stringify(rapport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-zonite-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
            <Shield className="w-8 h-8 text-[#1a1f5e]" />
            Audit Système Complet
          </h1>
          <p className="text-slate-500 mt-1">
            Vérification et correction automatique de l'intégrité du système Zonite
          </p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={autoCorrect}
              onChange={(e) => setAutoCorrect(e.target.checked)}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-2 border-slate-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Database className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-3xl font-bold text-slate-900">{rapport.summary.totalEntities}</p>
                  <p className="text-sm text-slate-500">Entités auditées</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <p className="text-3xl font-bold text-orange-600">{rapport.summary.totalIssues}</p>
                  <p className="text-sm text-slate-500">Problèmes détectés</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                  <p className="text-3xl font-bold text-emerald-600">{rapport.summary.correctedIssues}</p>
                  <p className="text-sm text-slate-500">Corrigés auto</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                  <p className="text-3xl font-bold text-red-600">{rapport.summary.manualInterventionNeeded}</p>
                  <p className="text-sm text-slate-500">Action manuelle</p>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${rapport.status === 'perfect' || rapport.status === 'corrected' ? 'border-emerald-500 bg-emerald-50' : 'border-orange-500 bg-orange-50'}`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shield className={`w-8 h-8 mx-auto mb-2 ${rapport.status === 'perfect' || rapport.status === 'corrected' ? 'text-emerald-600' : 'text-orange-600'}`} />
                  <Badge className={getBadgeStatus(rapport.status).classe}>
                    {getBadgeStatus(rapport.status).label}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">
                    {rapport.status === 'perfect' || rapport.status === 'corrected' ? 'Prêt pour prod' : 'Révision requise'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métadonnées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informations de l'audit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Date</p>
                  <p className="font-medium text-slate-900">
                    {new Date(rapport.timestamp).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Audité par</p>
                  <p className="font-medium text-slate-900">{rapport.auditedBy}</p>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={telechargerRapport}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger rapport JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Détails par section */}
          <div className="space-y-4">
            {rapport.sections.map((section, idx) => {
              const Icone = ICONES_SECTION[section.name] || Shield;
              // Ne compter que les vrais problèmes (pas les messages "info")
              const nbProblemes = section.issues.filter(issue => issue.severity !== 'info').length;
              const nbCorrections = section.corrections.length;
              
              return (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icone className="w-5 h-5 text-[#1a1f5e]" />
                        {section.name}
                      </div>
                      <div className="flex gap-2">
                        {nbProblemes > 0 && (
                          <Badge className="bg-orange-100 text-orange-800">
                            {nbProblemes} problème{nbProblemes > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {nbCorrections > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            {nbCorrections} correction{nbCorrections > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {nbProblemes === 0 && nbCorrections === 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Parfait
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Problèmes détectés */}
                    {section.issues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">
                          Problèmes détectés :
                        </h4>
                        <ScrollArea className="max-h-64">
                          <div className="space-y-2">
                            {section.issues.map((issue, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-lg border text-sm ${COULEUR_SEVERITE[issue.severity] || COULEUR_SEVERITE.info}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium">
                                      {issue.type || 'Info'}
                                      {issue.entity && ` - ${issue.entity}`}
                                      {issue.id && ` (ID: ${issue.id.substring(0, 8)}...)`}
                                    </p>
                                    {issue.issue && (
                                      <p className="text-xs mt-1 opacity-90">{issue.issue}</p>
                                    )}
                                    {issue.message && (
                                      <p className="text-xs mt-1 opacity-90">{issue.message}</p>
                                    )}
                                  </div>
                                  <Badge className="bg-white/50">
                                    {issue.severity}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Corrections appliquées */}
                    {section.corrections.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-700 mb-2">
                          Corrections appliquées :
                        </h4>
                        <ScrollArea className="max-h-48">
                          <div className="space-y-1">
                            {section.corrections.map((correction, i) => (
                              <div
                                key={i}
                                className="p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
                              >
                                <CheckCircle2 className="w-3 h-3 inline mr-2" />
                                {correction}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {section.issues.length === 0 && section.corrections.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        ✓ Aucun problème détecté dans cette section
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recommandations */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Recommandations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-800">
                {rapport.summary.manualInterventionNeeded > 0 && (
                  <p>
                    ⚠️ <strong>{rapport.summary.manualInterventionNeeded} problème(s)</strong> nécessite(nt) une intervention manuelle.
                  </p>
                )}
                {rapport.status === 'perfect' && (
                  <p>✅ <strong>Système parfait !</strong> Aucune anomalie détectée. Prêt pour la production.</p>
                )}
                {rapport.status === 'corrected' && (
                  <p>✅ <strong>Système corrigé !</strong> Toutes les anomalies ont été résolues automatiquement. Prêt pour la production.</p>
                )}
                <p>💡 Relancez régulièrement cet audit (hebdomadaire recommandé) pour maintenir l'intégrité du système.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* État initial */}
      {!rapport && !enCours && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Prêt pour l'audit
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Cliquez sur "Lancer l'audit" pour vérifier l'intégrité complète du système
            </p>
            <ul className="text-xs text-slate-600 text-left max-w-md mx-auto space-y-1">
              <li>✓ Vérification de toutes les entités (Sellers, Produits, Ventes, etc.)</li>
              <li>✓ Validation des workflows (KYC, Commissions, Stock)</li>
              <li>✓ Contrôle des permissions et rôles</li>
              <li>✓ Test du système de notifications</li>
              <li>✓ Détection et correction automatique des incohérences</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}