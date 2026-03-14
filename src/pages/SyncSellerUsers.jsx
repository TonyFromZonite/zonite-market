import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, AlertTriangle, Loader } from 'lucide-react';

export default function SyncSellerUsers() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [action, setAction] = useState('verify');

  const handleSync = async (syncAction) => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await base44.functions.invoke('syncSellerUsers', {
        action: syncAction
      });

      if (response.data.success) {
        setReport(response.data.report || response.data.sync_log);
        setAction(syncAction);
      } else {
        setError(response.data.error || 'Erreur lors de la synchronisation');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'appel de la fonction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Synchronisation Sellers ↔ Base44 Users</h1>
        <p className="text-slate-600 mt-2">Gestion et vérification de la synchronisation entre les vendeurs et les utilisateurs Base44</p>
      </div>

      {/* Boutons d'actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Vérifier
            </CardTitle>
            <CardDescription>Analyser sans modifier les données</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleSync('verify')}
              disabled={loading}
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading && action === 'verify' ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Vérification en cours...
                </>
              ) : (
                'Lancer la vérification'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Synchroniser
            </CardTitle>
            <CardDescription>Créer les utilisateurs manquants</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleSync('sync')}
              disabled={loading}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading && action === 'sync' ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation en cours...
                </>
              ) : (
                'Lancer la synchronisation'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Erreur */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 font-mono text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Résultats */}
      {report && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Résultats ({action === 'verify' ? 'Vérification' : 'Synchronisation'})</CardTitle>
            <CardDescription>
              {new Date(report.timestamp).toLocaleString('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'medium'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Total Sellers</p>
                <p className="text-2xl font-bold text-slate-900">{report.total_sellers}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Synchronisés</p>
                <p className="text-2xl font-bold text-blue-900">{report.synced}</p>
              </div>
              {report.created !== undefined && (
                <div className="bg-green-100 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Créés</p>
                  <p className="text-2xl font-bold text-green-900">{report.created}</p>
                </div>
              )}
              {report.updated !== undefined && (
                <div className="bg-amber-100 p-4 rounded-lg">
                  <p className="text-sm text-amber-600">Mis à jour</p>
                  <p className="text-2xl font-bold text-amber-900">{report.updated}</p>
                </div>
              )}
            </div>

            {/* Orphelins */}
            {report.orphans && report.orphans.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">🔴 Sellers orphelins ({report.orphans.length})</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-600">
                      <tr className="border-b border-red-200">
                        <th className="text-left py-2">Email</th>
                        <th className="text-left py-2">Nom</th>
                        <th className="text-left py-2">KYC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.orphans.map((orphan) => (
                        <tr key={orphan.seller_id} className="border-b border-red-100 hover:bg-red-100/50">
                          <td className="py-2 font-mono text-xs">{orphan.email}</td>
                          <td className="py-2 truncate">{orphan.nom_complet}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              orphan.statut_kyc === 'valide' ? 'bg-green-100 text-green-800' :
                              orphan.statut_kyc === 'rejete' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {orphan.statut_kyc}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sellers synchronisés */}
            {report.synced_sellers && report.synced_sellers.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">✅ Sellers synchronisés ({report.synced_sellers.length})</h3>
                <details className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-green-900 hover:text-green-800">
                    Afficher les détails
                  </summary>
                  <table className="w-full text-sm mt-4">
                    <thead className="text-slate-600">
                      <tr className="border-b border-green-200">
                        <th className="text-left py-2">Email</th>
                        <th className="text-left py-2">ID User Base44</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.synced_sellers.slice(0, 10).map((synced) => (
                        <tr key={synced.seller_id} className="border-b border-green-100 hover:bg-green-100/50">
                          <td className="py-2 font-mono text-xs">{synced.email}</td>
                          <td className="py-2 font-mono text-xs text-slate-600">{synced.user_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.synced_sellers.length > 10 && (
                    <p className="text-xs text-green-700 mt-2">... et {report.synced_sellers.length - 10} autres</p>
                  )}
                </details>
              </div>
            )}

            {/* Erreurs */}
            {report.errors && report.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">⚠️ Erreurs ({report.errors.length})</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-600">
                      <tr className="border-b border-yellow-200">
                        <th className="text-left py-2">Email</th>
                        <th className="text-left py-2">Erreur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.errors.map((err, idx) => (
                        <tr key={idx} className="border-b border-yellow-100 hover:bg-yellow-100/50">
                          <td className="py-2 font-mono text-xs">{err.seller_email || err.email || 'N/A'}</td>
                          <td className="py-2 text-xs">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">ℹ️ Comment ça marche ?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>
            <strong>Vérification :</strong> Analyze l'état actuel sans rien changer. Utile pour identifier les problèmes.
          </p>
          <p>
            <strong>Synchronisation :</strong> Crée automatiquement les utilisateurs Base44 manquants pour les sellers existants, et établit les liaisons.
          </p>
          <p>
            Tous les sellers créés par admin à l'avenir seront automatiquement synchronisés lors de leur création.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}