import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Play, CheckCircle2, AlertTriangle, XCircle, Download,
  Users, Package, ShoppingCart, Truck, Bell, Database
} from "lucide-react";

const ICONES_SECTION = {
  'Users & Sellers': Users,
  'Produits & Stock': Package,
  'Ventes & Commissions': ShoppingCart,
  'Livraisons & Zones': Truck,
  'Notifications': Bell
};

const COULEURS_SEVERITY = {
  critical: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', badge: 'bg-red-500' },
  high: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', badge: 'bg-orange-500' },
  medium: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-500' },
  low: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', badge: 'bg-blue-500' },
  info: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', badge: 'bg-slate-500' }
};

export default function AuditComplet() {
  const [rapport, setRapport] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [autoFix, setAutoFix] = useState(true);

  const lancerAudit = async () => {
    setEnCours(true);
    try {
      const response = await base44.functions.invoke('fullAuditReport', { autoFix });
      setRapport(response.data.report);
    } catch (error) {
      console.error('Erreur audit:', error);
      alert('Erreur lors de l\'audit: ' + error.message);
    } finally {
      setEnCours(false);
    }
  };

  const exporterCSV = () => {
    if (!rapport) return;

    let csv = "Section,Type,Severite,Entite,ID,Message\n";
    
    for (const section of rapport.sections) {
      for (const issue of section.issues) {
        csv += `"${section.name}","Issue","${issue.severity}","${issue.entity}","${issue.id || ''}","${issue.message.replace(/"/g, '""')}"\n`;
      }
      for (const correction of section.corrections) {
        csv += `"${section.name}","Correction","success","","","${correction.replace(/"/g, '""')}"\n`;
      }
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-zonite-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
            <Database className="w-8 h-8 text-[#1a1f5e]" />
            Audit Complet Système
          </h1>
          <p className="text-slate-500 mt-1">
            Analyse exhaustive : Users, Produits, Ventes, Livraisons, Notifications
          </p>
        </div>
        <div className="flex gap-3">
          {rapport && (
            <Button onClick={exporterCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          )}
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
                Lancer l'audit complet
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Résumé Global */}
      {rapport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-2 border-blue-200">
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

            <Card className="border-2 border-red-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                  <p className="text-3xl font-bold text-red-600">{rapport.summary.criticalIssues}</p>
                  <p className="text-sm text-slate-500">Critiques</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                  <p className="text-3xl font-bold text-emerald-600">{rapport.summary.correctedIssues}</p>
                  <p className="text-sm text-slate-500">Corrigés</p>
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
                  <p className="text-xs text-slate-500 mt-2">Statut système</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métadonnées */}
          <Card className="border-2 border-slate-200 bg-slate-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-500">Audité par :</span>
                    <span className="ml-2 font-medium text-slate-900">{rapport.auditedBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Date :</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {new Date(rapport.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sections :</span>
                    <span className="ml-2 font-medium text-slate-900">{rapport.sections.length}</span>
                  </div>
                </div>
                {rapport.summary.manualInterventionNeeded > 0 && (
                  <Badge className="bg-orange-500 text-white">
                    {rapport.summary.manualInterventionNeeded} intervention(s) manuelle(s)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sections détaillées */}
          <div className="space-y-4">
            {rapport.sections.map((section, idx) => {
              const Icone = ICONES_SECTION[section.name] || Shield;
              const nbProblemes = section.issues.filter(issue => issue.severity !== 'info').length;
              const nbCorrections = section.corrections.length;
              const hasCritical = section.issues.some(i => i.severity === 'critical');

              return (
                <Card key={idx} className={`border-2 ${hasCritical ? 'border-red-300' : 'border-slate-200'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icone className="w-5 h-5 text-[#1a1f5e]" />
                        {section.name}
                        <Badge variant="outline" className="ml-2">
                          {section.totalRecords} entités
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {nbProblemes > 0 && (
                          <Badge className="bg-orange-500 text-white">
                            {nbProblemes} problème{nbProblemes > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {nbCorrections > 0 && (
                          <Badge className="bg-emerald-500 text-white">
                            {nbCorrections} correction{nbCorrections > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {nbProblemes === 0 && nbCorrections === 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            ✓ Parfait
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>

                  {(section.issues.length > 0 || section.corrections.length > 0) && (
                    <CardContent>
                      {/* Problèmes */}
                      {section.issues.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">
                            Problèmes détectés ({section.issues.length})
                          </h4>
                          <ScrollArea className="max-h-64">
                            <div className="space-y-2">
                              {section.issues.map((issue, i) => {
                                const couleur = COULEURS_SEVERITY[issue.severity] || COULEURS_SEVERITY.info;
                                return (
                                  <div key={i} className={`p-3 ${couleur.bg} border ${couleur.border} rounded-lg`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge className={`${couleur.badge} text-white text-xs`}>
                                            {issue.severity}
                                          </Badge>
                                          <Badge variant="outline" className="text-xs">
                                            {issue.type}
                                          </Badge>
                                          {issue.entity && (
                                            <span className="text-xs text-slate-600">{issue.entity}</span>
                                          )}
                                        </div>
                                        <p className={`text-sm ${couleur.text} font-medium`}>
                                          {issue.message}
                                        </p>
                                        {issue.id && (
                                          <p className="text-xs text-slate-500 mt-1">ID: {issue.id}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Corrections */}
                      {section.corrections.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">
                            Corrections appliquées ({section.corrections.length})
                          </h4>
                          <ScrollArea className="max-h-48">
                            <div className="space-y-1">
                              {section.corrections.map((correction, i) => (
                                <div key={i} className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 inline mr-2" />
                                  {correction}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Statut final */}
          {rapport.status === 'perfect' && (
            <Card className="border-2 border-emerald-500 bg-emerald-50">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
                <h3 className="text-lg font-semibold text-emerald-900 mb-2">
                  Système Parfait ✓
                </h3>
                <p className="text-sm text-emerald-700">
                  Aucun problème détecté. Zonite est 100% synchronisé et prêt pour la production.
                </p>
              </CardContent>
            </Card>
          )}

          {rapport.status === 'corrected' && (
            <Card className="border-2 border-blue-500 bg-blue-50">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Système Corrigé ✓
                </h3>
                <p className="text-sm text-blue-700">
                  Tous les problèmes ont été automatiquement corrigés. Zonite est prêt pour la production.
                </p>
              </CardContent>
            </Card>
          )}

          {rapport.status === 'needs_attention' && (
            <Card className="border-2 border-orange-500 bg-orange-50">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-12 h-12 text-orange-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-orange-900 mb-2">
                      Intervention manuelle requise
                    </h3>
                    <p className="text-sm text-orange-700 mb-3">
                      <strong>{rapport.summary.manualInterventionNeeded}</strong> problème(s) nécessitent une action manuelle.
                    </p>
                    <ul className="text-xs text-orange-800 space-y-1">
                      <li>• Consultez les sections ci-dessus pour identifier les problèmes critiques</li>
                      <li>• Exportez le rapport CSV pour une analyse détaillée</li>
                      <li>• Relancez l'audit après corrections pour vérifier</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* État initial */}
      {!rapport && !enCours && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="py-12 text-center">
            <Database className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Prêt pour l'audit complet
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Analyse exhaustive de toutes les entités critiques avec auto-correction
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg">
                <Users className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                <p className="font-medium">Users & Sellers</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <Package className="w-6 h-6 mx-auto mb-1 text-indigo-600" />
                <p className="font-medium">Produits & Stock</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <ShoppingCart className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                <p className="font-medium">Ventes & Commissions</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <Truck className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                <p className="font-medium">Livraisons & Zones</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <Bell className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                <p className="font-medium">Notifications</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <Shield className="w-6 h-6 mx-auto mb-1 text-red-600" />
                <p className="font-medium">Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}