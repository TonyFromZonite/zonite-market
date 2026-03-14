import React from "react";
import { Card } from "@/components/ui/card";
import { FileText, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function DocumentationSysteme() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">📚 Documentation Système ZONITE</h1>
        <p className="text-slate-600">Version 2.0 - Audit & Réparation Intégrés</p>
      </div>

      {/* Résumé Exécutif */}
      <Card className="p-6 bg-blue-50 border-2 border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Résumé Exécutif
        </h2>
        <div className="prose prose-sm max-w-none text-blue-900">
          <p>
            Ce système a été complètement audité et stabilisé. Les corrections incluent:
          </p>
          <ul className="mt-2 space-y-1">
            <li>✅ Entité CommandeVente restaurée avec localisation obligatoire</li>
            <li>✅ Workflow vendeur unifié (création → KYC → activation)</li>
            <li>✅ Système d'audit automatique des incohérences</li>
            <li>✅ Réparation automatique avec simulation</li>
            <li>✅ Validation stock stricte (ville/zone/variation)</li>
          </ul>
        </div>
      </Card>

      {/* Fonctions Clés */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">🔧 Fonctions Backend Clés</h2>
        <div className="space-y-4">
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="font-bold text-emerald-900 mb-2">createSellerComplete</h3>
            <p className="text-sm text-emerald-800 mb-2">
              Création complète d'un vendeur avec workflow automatisé
            </p>
            <div className="bg-emerald-100 p-3 rounded font-mono text-xs">
              <p className="text-emerald-900">Paramètres:</p>
              <pre className="mt-1">{`{
  email: "vendeur@example.com",
  nom_complet: "Jean Dupont",
  mot_de_passe: "password123",
  telephone: "+237...",
  auto_valider_kyc: true | false
}`}</pre>
            </div>
            <p className="text-xs text-emerald-700 mt-2">
              📧 Envoie automatiquement: notification in-app + email avec identifiants + journal audit
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-bold text-purple-900 mb-2">validateKycComplete</h3>
            <p className="text-sm text-purple-800 mb-2">
              Validation KYC + activation vendeur en une seule action
            </p>
            <div className="bg-purple-100 p-3 rounded font-mono text-xs">
              <p className="text-purple-900">Paramètres:</p>
              <pre className="mt-1">{`{
  seller_id: "...",
  notes_admin: "Documents validés"
}`}</pre>
            </div>
            <p className="text-xs text-purple-700 mt-2">
              🎉 Active le compte, débloque le catalogue, envoie notifications
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-2">systemIntegrityAudit</h3>
            <p className="text-sm text-blue-800 mb-2">
              Audit complet du système - détecte toutes les incohérences
            </p>
            <div className="bg-blue-100 p-3 rounded text-xs">
              <p className="font-semibold text-blue-900 mb-1">Vérifie:</p>
              <ul className="text-blue-800 space-y-0.5 ml-4">
                <li>• Sellers: statuts incohérents, champs manquants</li>
                <li>• Produits: stocks désynchronisés, variations orphelines</li>
                <li>• Ventes/Commandes: localisation manquante</li>
                <li>• Notifications: quantité non lues</li>
              </ul>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-bold text-orange-900 mb-2">repairSystemIntegrity</h3>
            <p className="text-sm text-orange-800 mb-2">
              Réparation automatique avec simulation ou exécution
            </p>
            <div className="bg-orange-100 p-3 rounded font-mono text-xs">
              <p className="text-orange-900">Modes:</p>
              <pre className="mt-1">{`{
  mode: "dry-run"  // Simulation
  mode: "execute"  // Application réelle
}`}</pre>
            </div>
            <p className="text-xs text-orange-700 mt-2">
              ⚠️ Toujours lancer dry-run avant execute
            </p>
          </div>
        </div>
      </Card>

      {/* Architecture Stock */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">📦 Architecture Stock Localisée</h2>
        <div className="bg-slate-50 p-4 rounded-lg border">
          <pre className="font-mono text-xs text-slate-700">{`Produit
├─ stock_global (calculé automatiquement)
├─ variations_definition[] (définition des variations)
│  └─ { attributs: "Rouge / M", prix_vente_specifique: 5000 }
│
└─ stocks_par_localisation[]
   ├─ ville: "Douala"
   ├─ zone: "Akwa"
   ├─ seuil_alerte: 5
   └─ variations_stock[]
      ├─ { attributs: "Rouge / M", quantite: 10 }
      ├─ { attributs: "Bleu / L", quantite: 5 }
      └─ { attributs: "Noir / S", quantite: 8 }`}</pre>
        </div>
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Règles Strictes</p>
          <ul className="text-xs text-yellow-800 space-y-1 ml-4">
            <li>• Toute vente DOIT spécifier: ville, zone, variation</li>
            <li>• Stock validé AVANT création vente</li>
            <li>• Décrément automatique de la variation spécifique</li>
            <li>• Recalcul automatique du stock_global</li>
          </ul>
        </div>
      </Card>

      {/* Workflow Vente */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">💰 Workflow Enregistrement Vente</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Sélection Produit</p>
              <p className="text-sm text-slate-600">Chargement disponibilité via <code className="bg-slate-100 px-1 rounded">getProductAvailability</code></p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Cascade de Sélection</p>
              <p className="text-sm text-slate-600">Ville → Zone → Variation (filtrées dynamiquement)</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Validation Stock</p>
              <p className="text-sm text-slate-600">Vérification via <code className="bg-slate-100 px-1 rounded">validateStockBeforeSale</code></p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Transaction Atomique</p>
              <p className="text-sm text-slate-600">Création Vente + Décrément stock + Mise à jour commissions</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Procédure Maintenance */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">🛡️ Procédure Maintenance Mensuelle</h2>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">1.</span>
            <div>
              <p className="font-semibold">Accéder à "Intégrité Système"</p>
              <p className="text-sm text-slate-600">Menu Admin → Intégrité Système</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-purple-600">2.</span>
            <div>
              <p className="font-semibold">Lancer Audit Complet</p>
              <p className="text-sm text-slate-600">Bouton "Lancer Audit" - analyse 1-2 minutes</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-orange-600">3.</span>
            <div>
              <p className="font-semibold">Analyser Rapport</p>
              <p className="text-sm text-slate-600">Statistiques + liste problèmes détectés</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-yellow-600">4.</span>
            <div>
              <p className="font-semibold">Simuler Réparations</p>
              <p className="text-sm text-slate-600">Bouton "Simuler" - voir corrections proposées</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-emerald-600">5.</span>
            <div>
              <p className="font-semibold">Exécuter Corrections</p>
              <p className="text-sm text-slate-600">Bouton "Exécuter" - application en base</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-red-600">6.</span>
            <div>
              <p className="font-semibold">Vérification Finale</p>
              <p className="text-sm text-slate-600">Relancer audit pour confirmer = 0 problème</p>
            </div>
          </li>
        </ol>
      </Card>

      {/* Règles Cohérence */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">✅ Règles de Cohérence</h2>
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">Statuts Vendeur</p>
            <div className="font-mono text-xs text-blue-800 space-y-1">
              <p>IF statut_kyc = 'valide' THEN statut = 'actif'</p>
              <p>IF statut = 'actif' THEN statut_kyc = 'valide'</p>
              <p>IF statut_kyc = 'en_attente' THEN statut = 'en_attente_kyc'</p>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="font-semibold text-purple-900 mb-2">Stocks Produit</p>
            <div className="font-mono text-xs text-purple-800">
              <p>stock_global = SUM(ALL variations.quantite)</p>
              <p className="text-[10px] mt-1 text-purple-600">Recalculé automatiquement après chaque vente</p>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="font-semibold text-orange-900 mb-2">Ventes/Commandes</p>
            <div className="font-mono text-xs text-orange-800 space-y-1">
              <p>ville NOT NULL</p>
              <p>zone NOT NULL</p>
              <p>variation NOT NULL</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-slate-500 pt-6 border-t">
        <p>✅ Documentation système - Version 2.0</p>
        <p>Dernière mise à jour: Mars 2026</p>
      </div>
    </div>
  );
}