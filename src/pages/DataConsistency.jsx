import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, Shield } from "lucide-react";

export default function DataConsistency() {
  const [rapport, setRapport] = useState(null);
  const [reparation, setReparation] = useState(null);
  const [loading, setLoading] = useState(false);

  const lancerAudit = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('verifyDataConsistency', {});
      setRapport(result.data.rapport);
    } catch (error) {
      alert('Erreur audit: ' + error.message);
    }
    setLoading(false);
  };

  const lancerReparation = async (dryRun = true) => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('repairDataConsistency', {
        dry_run: dryRun
      });
      setReparation(result.data.resultat);
    } catch (error) {
      alert('Erreur réparation: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-[#1a1f5e]" />
          Cohérence des Données
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Audit et réparation de la synchronisation des données
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={lancerAudit}
          disabled={loading}
          className="bg-[#1a1f5e] hover:bg-[#141952]"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Audit en cours...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Lancer Audit
            </>
          )}
        </Button>

        {rapport && rapport.problemes_detectes.length > 0 && (
          <>
            <Button
              onClick={() => lancerReparation(true)}
              disabled={loading}
              variant="outline"
            >
              Simuler Réparation (Dry Run)
            </Button>
            <Button
              onClick={() => {
                if (confirm('Confirmer les réparations ?')) {
                  lancerReparation(false);
                }
              }}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              Exécuter Réparations
            </Button>
          </>
        )}
      </div>

      {/* Rapport Audit */}
      {rapport && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Rapport d'Audit
          </h2>
          <p className="text-sm text-slate-500">
            {new Date(rapport.timestamp).toLocaleString('fr-FR')}
          </p>

          {/* Entités vérifiées */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Entités Vérifiées</h3>
            <div className="flex flex-wrap gap-2">
              {rapport.entites_verifiees.map(e => (
                <Badge key={e} variant="outline">{e}</Badge>
              ))}
            </div>
          </div>

          {/* Total enregistrements */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Total Enregistrements</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {Object.entries(rapport.total_enregistrements).map(([entite, stats]) => (
                <div key={entite} className="bg-slate-50 rounded-lg p-3">
                  <p className="font-semibold text-xs text-slate-900">{entite}</p>
                  <p className="text-sm text-slate-700">
                    Total: {stats.total_reel} | Visible: {stats.visible_user}
                  </p>
                  {stats.difference > 0 && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {stats.difference} masqués (RLS)
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Problèmes détectés */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              {rapport.problemes_detectes.length > 0 ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              )}
              Problèmes Détectés ({rapport.problemes_detectes.length})
            </h3>

            {rapport.problemes_detectes.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-700 font-medium">
                  ✅ Aucun problème de cohérence détecté
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rapport.problemes_detectes.map((pb, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-red-900">
                          {pb.entite} - {pb.type}
                        </p>
                        <p className="text-sm text-red-700">{pb.description}</p>
                        {pb.count && (
                          <Badge className="mt-1 bg-red-600 text-white">
                            {pb.count} enregistrements
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommandations */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Recommandations</h3>
            <ul className="space-y-1 text-sm text-slate-700">
              {rapport.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Résultat Réparation */}
      {reparation && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Résultat de Réparation
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant={reparation.mode === 'dry_run' ? 'secondary' : 'default'}>
              {reparation.mode === 'dry_run' ? 'Simulation' : 'Exécution'}
            </Badge>
            <p className="text-sm text-slate-500">
              {new Date(reparation.timestamp).toLocaleString('fr-FR')}
            </p>
          </div>

          {/* Actions effectuées */}
          <div>
            <h3 className="font-semibold text-sm mb-2">
              Actions ({reparation.actions_effectuees.length})
            </h3>
            <div className="space-y-2">
              {reparation.actions_effectuees.map((action, idx) => (
                <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-semibold text-sm text-blue-900">
                    {action.action}
                  </p>
                  <p className="text-sm text-blue-700">{action.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-blue-600">
                      {action.count} éléments
                    </Badge>
                    <Badge variant={action.executed ? 'default' : 'secondary'}>
                      {action.executed ? '✅ Exécuté' : '⚠️ Simulé'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Erreurs */}
          {reparation.erreurs.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2 text-red-900">
                Erreurs ({reparation.erreurs.length})
              </h3>
              <div className="space-y-2">
                {reparation.erreurs.map((err, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="font-semibold text-sm text-red-900">
                      {err.action}
                    </p>
                    <p className="text-sm text-red-700">{err.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="font-semibold text-sm text-slate-900 mb-2">Résumé</p>
            <p className="text-sm text-slate-700">{reparation.summary.message}</p>
            <div className="flex gap-3 mt-2">
              <Badge>
                {reparation.summary.total_actions} actions
              </Badge>
              {reparation.summary.total_erreurs > 0 && (
                <Badge variant="destructive">
                  {reparation.summary.total_erreurs} erreurs
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}