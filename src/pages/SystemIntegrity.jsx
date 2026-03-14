import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Shield, AlertTriangle, CheckCircle2, Loader2, 
  RefreshCw, AlertCircle, Database, Users, Package, ShoppingCart
} from "lucide-react";

export default function SystemIntegrity() {
  const [loading, setLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [repairReport, setRepairReport] = useState(null);
  const [mode, setMode] = useState('dry-run');

  const runAudit = async () => {
    setLoading(true);
    setAuditReport(null);
    try {
      const response = await base44.functions.invoke('systemIntegrityAudit', {});
      setAuditReport(response.data.rapport);
    } catch (error) {
      alert('Erreur audit: ' + error.message);
    }
    setLoading(false);
  };

  const runRepair = async (executeMode) => {
    const confirmMsg = executeMode === 'execute'
      ? 'ATTENTION: Vous allez MODIFIER les données en base. Continuer ?'
      : 'Lancer une simulation des réparations (aucune modification) ?';

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setRepairReport(null);
    try {
      const response = await base44.functions.invoke('repairSystemIntegrity', { mode: executeMode });
      setRepairReport(response.data.rapport);
    } catch (error) {
      alert('Erreur réparation: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#1a1f5e]" />
            Intégrité Système
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit complet et réparation automatique des données
          </p>
        </div>
        <Button
          onClick={runAudit}
          disabled={loading}
          className="bg-[#1a1f5e] hover:bg-[#141952]"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyse...</>
          ) : (
            <><Database className="w-4 h-4 mr-2" /> Lancer Audit</>
          )}
        </Button>
      </div>

      {/* Rapport d'Audit */}
      {auditReport && (
        <Card className="p-6 border-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {auditReport.statut === 'SAIN' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              Rapport d'Audit
            </h2>
            <span className="text-xs text-slate-500">
              {new Date(auditReport.timestamp).toLocaleString('fr-FR')}
            </span>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Vendeurs</span>
              </div>
              <p className="text-lg font-bold text-blue-900">
                {auditReport.statistiques.total_sellers || 0}
              </p>
              <p className="text-xs text-blue-600">
                {auditReport.statistiques.sellers_actifs || 0} actifs
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-700 font-medium">Produits</span>
              </div>
              <p className="text-lg font-bold text-purple-900">
                {auditReport.statistiques.total_produits || 0}
              </p>
              <p className="text-xs text-purple-600">
                {auditReport.statistiques.produits_actifs || 0} actifs
              </p>
            </div>

            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Ventes</span>
              </div>
              <p className="text-lg font-bold text-emerald-900">
                {auditReport.statistiques.total_ventes || 0}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-700 font-medium">Problèmes</span>
              </div>
              <p className="text-lg font-bold text-yellow-900">
                {auditReport.total_problemes || 0}
              </p>
            </div>
          </div>

          {/* Liste des Problèmes */}
          {auditReport.problemes && auditReport.problemes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 mb-2">Problèmes Détectés</h3>
              {auditReport.problemes.map((pb, idx) => (
                <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-900 text-sm">{pb.type}</p>
                      {pb.count && (
                        <p className="text-xs text-yellow-700 mt-0.5">Nombre: {pb.count}</p>
                      )}
                      {pb.details && (
                        <pre className="text-xs text-yellow-800 mt-2 bg-yellow-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(pb.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Boutons de Réparation */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={() => runRepair('dry-run')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Simuler Réparations
                </Button>
                <Button
                  onClick={() => runRepair('execute')}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Exécuter Réparations
                </Button>
              </div>
            </div>
          )}

          {auditReport.problemes && auditReport.problemes.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-900">Système Sain</p>
              <p className="text-sm text-emerald-700">Aucun problème détecté</p>
            </div>
          )}
        </Card>
      )}

      {/* Rapport de Réparation */}
      {repairReport && (
        <Card className="p-6 border-2 border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Rapport de Réparation
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                repairReport.mode.includes('DRY-RUN')
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {repairReport.mode}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(repairReport.timestamp).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4 mb-4">
            <p className="text-center text-2xl font-bold text-emerald-900">
              {repairReport.total_reparations}
            </p>
            <p className="text-center text-sm text-emerald-700">
              {repairReport.mode.includes('DRY-RUN') ? 'Réparations simulées' : 'Réparations effectuées'}
            </p>
          </div>

          {repairReport.reparations && repairReport.reparations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 mb-2">Détails des Réparations</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {repairReport.reparations.map((rep, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="font-medium text-slate-900 text-sm">{rep.type}</p>
                    <pre className="text-xs text-slate-600 mt-1 bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(rep, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Guide */}
      {!auditReport && !repairReport && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Guide d'utilisation</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Audit</strong> - Analyse complète du système pour détecter les incohérences</p>
            <p><strong>2. Simulation</strong> - Affiche les réparations qui seraient effectuées sans modifier les données</p>
            <p><strong>3. Exécution</strong> - Applique les corrections automatiques en base de données</p>
          </div>
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium">
              ⚠️ Toujours lancer une simulation avant d'exécuter les réparations
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}