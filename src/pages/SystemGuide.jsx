import React from "react";
import { Card } from "@/components/ui/card";
import { 
  Book, Users, Package, ShoppingCart, Shield, 
  CheckCircle2, AlertTriangle, Database
} from "lucide-react";

export default function SystemGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Book className="w-7 h-7 text-[#1a1f5e]" />
          Guide Système ZONITE
        </h1>
        <p className="text-sm text-slate-500">
          Documentation complète de l'architecture et des workflows
        </p>
      </div>

      {/* 1. Architecture Globale */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          1. Architecture Globale
        </h2>
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <strong>Base de données:</strong> Toutes les entités sont stockées dans la base Base44 avec des règles RLS (Row Level Security).
          </p>
          <div className="bg-slate-50 p-4 rounded-lg border">
            <p className="font-semibold mb-2">Entités Principales:</p>
            <ul className="space-y-1 ml-4">
              <li>• <strong>Seller</strong> - Comptes vendeurs (authentification, KYC, commissions)</li>
              <li>• <strong>Produit</strong> - Catalogue produits avec variations et stocks localisés</li>
              <li>• <strong>Vente</strong> - Transactions enregistrées par admin/vendeur</li>
              <li>• <strong>CommandeVendeur</strong> - Commandes passées par les vendeurs</li>
              <li>• <strong>Livraison</strong> - Méthodes et coûts de livraison</li>
              <li>• <strong>NotificationVendeur</strong> - Notifications in-app pour vendeurs</li>
              <li>• <strong>JournalAudit</strong> - Traçabilité de toutes les actions</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 2. Workflow Vendeur */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          2. Workflow Vendeur
        </h2>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">Étape 1: Création du compte</p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4">
              <li>• L'admin crée le vendeur via <code className="bg-blue-100 px-1 rounded">createSellerComplete</code></li>
              <li>• Email + mot de passe hashé (bcrypt)</li>
              <li>• Statut initial: <code>en_attente_kyc</code> ou <code>actif</code> (si auto-validé)</li>
              <li>• Notification email + in-app envoyées automatiquement</li>
            </ul>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="font-semibold text-purple-900 mb-2">Étape 2: Validation KYC</p>
            <ul className="text-sm text-purple-800 space-y-1 ml-4">
              <li>• L'admin valide le KYC via <code className="bg-purple-100 px-1 rounded">validateKycComplete</code></li>
              <li>• Statut devient: <code>statut_kyc: 'valide'</code>, <code>statut: 'actif'</code></li>
              <li>• Déblocage automatique: <code>catalogue_debloque: true</code></li>
              <li>• Notifications + email de confirmation</li>
            </ul>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-2">Étape 3: Activation complète</p>
            <ul className="text-sm text-emerald-800 space-y-1 ml-4">
              <li>• Le vendeur peut accéder au catalogue complet</li>
              <li>• Passer des commandes via l'interface mobile</li>
              <li>• Gagner des commissions sur les ventes validées</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 3. Gestion Stock */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          3. Gestion Stock Localisée
        </h2>
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-semibold">Structure hiérarchique:</p>
          <div className="bg-slate-50 p-4 rounded-lg border font-mono text-xs">
            <p>Produit</p>
            <p className="ml-4">└─ stocks_par_localisation[]</p>
            <p className="ml-8">├─ ville</p>
            <p className="ml-8">├─ zone</p>
            <p className="ml-8">└─ variations_stock[]</p>
            <p className="ml-12">├─ attributs (ex: "Rouge / M")</p>
            <p className="ml-12">└─ quantite</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="font-semibold text-yellow-900 mb-2">⚠️ Règles de Validation</p>
            <ul className="text-sm text-yellow-800 space-y-1 ml-4">
              <li>• Toute vente DOIT spécifier: ville, zone, variation</li>
              <li>• Stock validé via <code className="bg-yellow-100 px-1 rounded">validateStockBeforeSale</code></li>
              <li>• Décrément automatique du stock de la variation spécifique</li>
              <li>• Recalcul automatique du <code>stock_global</code></li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 4. Enregistrement Vente */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-600" />
          4. Workflow Enregistrement Vente
        </h2>
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-semibold">Processus automatisé (NouvelleVente.jsx):</p>
          <ol className="space-y-2 ml-4">
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <div>
                <p className="font-semibold">Sélection produit → Chargement disponibilité</p>
                <p className="text-xs text-slate-600">Via <code>getProductAvailability</code> - retourne villes, zones, variations avec stock</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">2.</span>
              <div>
                <p className="font-semibold">Cascade de sélection</p>
                <p className="text-xs text-slate-600">Ville → Zone → Variation (filtrées dynamiquement selon stock disponible)</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-orange-600">3.</span>
              <div>
                <p className="font-semibold">Validation stock</p>
                <p className="text-xs text-slate-600">Avant soumission, vérification via <code>validateStockBeforeSale</code></p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-emerald-600">4.</span>
              <div>
                <p className="font-semibold">Création vente + Décrément stock</p>
                <p className="text-xs text-slate-600">Transaction atomique: création Vente + mise à jour stock variation spécifique</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-pink-600">5.</span>
              <div>
                <p className="font-semibold">Mise à jour commissions</p>
                <p className="text-xs text-slate-600">Calcul et ajout au solde vendeur automatiquement</p>
              </div>
            </li>
          </ol>
        </div>
      </Card>

      {/* 5. Audit et Réparation */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          5. Audit et Réparation Système
        </h2>
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-semibold">Outils de Maintenance (Admin uniquement):</p>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">
              <code className="bg-blue-100 px-2 py-1 rounded">systemIntegrityAudit</code>
            </p>
            <p className="text-sm text-blue-800">
              Analyse complète du système, détecte les incohérences dans:
            </p>
            <ul className="text-sm text-blue-800 ml-4 mt-1 space-y-1">
              <li>• Statuts vendeurs (KYC vs activation)</li>
              <li>• Stocks globaux vs stocks localisés</li>
              <li>• Variations orphelines</li>
              <li>• Ventes/Commandes sans localisation</li>
            </ul>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p className="font-semibold text-emerald-900 mb-2">
              <code className="bg-emerald-100 px-2 py-1 rounded">repairSystemIntegrity</code>
            </p>
            <p className="text-sm text-emerald-800">
              Réparation automatique avec 2 modes:
            </p>
            <ul className="text-sm text-emerald-800 ml-4 mt-1 space-y-1">
              <li>• <strong>dry-run</strong>: Simulation sans modification</li>
              <li>• <strong>execute</strong>: Application des corrections en base</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="font-semibold text-yellow-900 mb-2">⚠️ Procédure Recommandée</p>
            <ol className="text-sm text-yellow-800 ml-4 space-y-1">
              <li>1. Lancer l'audit</li>
              <li>2. Analyser les problèmes détectés</li>
              <li>3. Exécuter réparation en mode <code>dry-run</code></li>
              <li>4. Valider les corrections proposées</li>
              <li>5. Exécuter en mode <code>execute</code></li>
            </ol>
          </div>
        </div>
      </Card>

      {/* 6. Permissions */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          6. Système de Permissions (RLS)
        </h2>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="font-semibold text-red-900 mb-1">Admin</p>
              <ul className="text-xs text-red-800 space-y-0.5">
                <li>✓ Accès total à toutes les entités</li>
                <li>✓ Créer/Modifier/Supprimer vendeurs</li>
                <li>✓ Valider KYC</li>
                <li>✓ Gérer stock et produits</li>
                <li>✓ Enregistrer ventes</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-900 mb-1">Sous-Admin</p>
              <ul className="text-xs text-blue-800 space-y-0.5">
                <li>✓ Permissions limitées configurables</li>
                <li>✓ Lecture seule par défaut</li>
                <li>✓ Validations selon permissions</li>
                <li>✗ Pas de suppression</li>
              </ul>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <p className="font-semibold text-emerald-900 mb-1">Vendeur (Actif)</p>
              <ul className="text-xs text-emerald-800 space-y-0.5">
                <li>✓ Voir catalogue complet</li>
                <li>✓ Passer commandes</li>
                <li>✓ Voir ses propres ventes</li>
                <li>✓ Gérer son profil</li>
                <li>✗ Pas d'accès admin</li>
              </ul>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-900 mb-1">Vendeur (En attente KYC)</p>
              <ul className="text-xs text-yellow-800 space-y-0.5">
                <li>✓ Connexion autorisée</li>
                <li>✗ Catalogue bloqué</li>
                <li>✗ Pas de commandes</li>
                <li>✓ Soumission documents KYC</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}