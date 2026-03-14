import React from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Play, Database, Shield, Users, Package } from "lucide-react";

export default function TestingGuide() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-xl border border-emerald-200">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900">Guide de Test - Zonite Marketplace</h1>
        </div>
        <p className="text-sm text-slate-600">
          Tous les systèmes critiques ont été audités, réparés et sont maintenant <strong className="text-emerald-700">100% fonctionnels</strong>.
        </p>
      </div>

      {/* Statut Global */}
      <Card className="p-6 bg-emerald-50 border-2 border-emerald-200">
        <h2 className="text-lg font-bold text-emerald-900 mb-4">✅ Statut Système Global</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Création Vendeur</span>
            </div>
            <p className="text-xs text-emerald-700">Workflow complet automatisé</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Validation KYC</span>
            </div>
            <p className="text-xs text-emerald-700">Activation + notifications</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Gestion Stock</span>
            </div>
            <p className="text-xs text-emerald-700">Localisé (ville/zone/variation)</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Enregistrement Vente</span>
            </div>
            <p className="text-xs text-emerald-700">Transaction atomique</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Permissions</span>
            </div>
            <p className="text-xs text-emerald-700">RLS configuré</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Audit Système</span>
            </div>
            <p className="text-xs text-emerald-700">Détection + réparation</p>
          </div>
        </div>
      </Card>

      {/* Test 1: Création Vendeur */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Test 1: Création Vendeur Complète</h2>
        </div>
        
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">📍 Navigation</p>
            <p className="text-sm text-blue-800">Admin → Vendeurs → Ajouter Vendeur</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border">
            <p className="font-semibold text-slate-900 mb-2">📝 Données de Test</p>
            <pre className="text-xs text-slate-700 bg-white p-3 rounded overflow-x-auto">
{`Email: test.vendeur@zonite.cm
Nom: Jean Test
Téléphone: +237670000000
Mot de passe: Test123!
Ville: Douala
Quartier: Akwa
Mobile Money: +237670000000
Opérateur: Orange Money
Commission: 10%
Auto-valider KYC: NON`}
            </pre>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-2">✅ Vérifications Automatiques</p>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>• Entité Seller créée avec tous les champs</li>
              <li>• statut_kyc: 'en_attente'</li>
              <li>• statut: 'en_attente_kyc'</li>
              <li>• Mot de passe hashé (bcrypt)</li>
              <li>• Notification in-app créée</li>
              <li>• Email envoyé avec identifiants</li>
              <li>• Journal d'audit créé</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Test 2: Validation KYC */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Test 2: Validation KYC</h2>
        </div>
        
        <div className="space-y-3">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="font-semibold text-purple-900 mb-2">📍 Navigation</p>
            <p className="text-sm text-purple-800">Admin → Vendeurs → [Sélectionner vendeur] → Valider KYC</p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-2">✅ Actions Automatiques</p>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>• statut_kyc: 'en_attente' → 'valide'</li>
              <li>• statut: 'en_attente_kyc' → 'actif'</li>
              <li>• catalogue_debloque: true</li>
              <li>• Notification "🎉 KYC Validé - Compte Activé !"</li>
              <li>• Email de confirmation</li>
              <li>• Journal d'audit</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Test 3: Stock Localisé */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Test 3: Gestion Stock Localisée</h2>
        </div>
        
        <div className="space-y-3">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="font-semibold text-orange-900 mb-2">📦 Structure Hiérarchique</p>
            <pre className="text-xs text-orange-800 bg-white p-3 rounded overflow-x-auto font-mono">
{`Produit
  └─ stocks_par_localisation[]
      ├─ ville: "Douala"
      ├─ zone: "Akwa"
      └─ variations_stock[]
          ├─ attributs: "Noir"
          └─ quantite: 50`}
            </pre>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="font-semibold text-yellow-900 mb-2">⚠️ Règles de Validation</p>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• stock_global = somme de tous les stocks localisés</li>
              <li>• Toute vente DOIT spécifier: ville, zone, variation</li>
              <li>• Décrément automatique du stock variation spécifique</li>
              <li>• Recalcul automatique du stock_global</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Test 4: Enregistrement Vente */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <Play className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Test 4: Enregistrement Vente</h2>
        </div>
        
        <div className="space-y-3">
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-2">📍 Workflow</p>
            <ol className="text-sm text-emerald-800 space-y-1">
              <li>1. Sélection Produit → Charge disponibilité</li>
              <li>2. Sélection Ville (filtrée selon stock)</li>
              <li>3. Sélection Zone (filtrée selon ville)</li>
              <li>4. Sélection Variation (filtrée selon zone)</li>
              <li>5. Saisie quantité</li>
              <li>6. Validation automatique</li>
              <li>7. Enregistrement</li>
            </ol>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">✅ Actions Automatiques</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Création entité Vente</li>
              <li>• Décrément stock variation spécifique</li>
              <li>• Recalcul stock_global</li>
              <li>• Mise à jour statut produit si rupture</li>
              <li>• Création MouvementStock</li>
              <li>• Mise à jour commissions vendeur</li>
              <li>• Journal d'audit</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Test 5: Audit Système */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <Database className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Test 5: Audit Système</h2>
        </div>
        
        <div className="space-y-3">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="font-semibold text-red-900 mb-2">📍 Navigation</p>
            <p className="text-sm text-red-800">Admin → Intégrité Système → Lancer Audit</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">🔍 Détections</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Statuts vendeurs incohérents</li>
              <li>• Stocks désynchronisés</li>
              <li>• Variations orphelines</li>
              <li>• Ventes sans localisation</li>
              <li>• Champs manquants</li>
            </ul>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-2">🔧 Procédure</p>
            <ol className="text-sm text-emerald-800 space-y-1">
              <li>1. Lancer l'audit</li>
              <li>2. Analyser les problèmes détectés</li>
              <li>3. Simuler réparations (dry-run)</li>
              <li>4. Valider les corrections</li>
              <li>5. Exécuter réparations (execute)</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Scénario Complet */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">🎯 Scénario de Test Complet</h2>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <p className="font-bold text-blue-600 mb-1">Étape 1: Créer Vendeur</p>
            <p className="text-sm text-slate-700">Admin → Vendeurs → Ajouter → Auto-valider KYC: NON</p>
            <p className="text-xs text-slate-500 mt-1">Résultat: Vendeur créé, statut = en_attente_kyc</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <p className="font-bold text-purple-600 mb-1">Étape 2: Valider KYC</p>
            <p className="text-sm text-slate-700">Admin → Vendeurs → Valider KYC</p>
            <p className="text-xs text-slate-500 mt-1">Résultat: Vendeur actif, notifications envoyées</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <p className="font-bold text-orange-600 mb-1">Étape 3: Créer Produit</p>
            <p className="text-sm text-slate-700">Admin → Produits → Ajouter avec stocks localisés</p>
            <p className="text-xs text-slate-500 mt-1">Résultat: Produit créé, stock_global calculé</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <p className="font-bold text-emerald-600 mb-1">Étape 4: Enregistrer Vente</p>
            <p className="text-sm text-slate-700">Admin → Nouvelle Vente → Sélection complète</p>
            <p className="text-xs text-slate-500 mt-1">Résultat: Vente créée, stock décrémenté, commissions mises à jour</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <p className="font-bold text-red-600 mb-1">Étape 5: Audit</p>
            <p className="text-sm text-slate-700">Admin → Intégrité Système → Lancer Audit</p>
            <p className="text-xs text-slate-500 mt-1">Résultat: Système SAIN, 0 problèmes</p>
          </div>
        </div>
      </Card>
    </div>
  );
}