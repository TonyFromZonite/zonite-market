# 🏗️ ARCHITECTURE DU SYSTÈME ZONITE

## 1. Vue d'Ensemble

### 1.1 Qu'est-ce que ZONITE ?

ZONITE est une plateforme complète de gestion de réseau de vendeurs (marketplace B2B2C) qui permet :

- **Gestion d'un réseau de vendeurs indépendants**
- **Vente de produits** avec gestion multi-localisations et variations
- **Suivi des commandes et livraisons** avec workflow complet
- **Calcul et paiement automatique des commissions**
- **Validation KYC obligatoire** (Know Your Customer)
- **Formation obligatoire** avant activation vendeur
- **Système de support** intégré multi-canal
- **Tableaux de bord analytiques** en temps réel
- **Audit complet** de toutes les opérations

### 1.2 Objectifs Principaux

1. **Sécurité** : Authentification centralisée via Base44
2. **Intégrité** : Source unique de vérité (Base44 Users)
3. **Traçabilité** : Audit complet de toutes les actions
4. **Scalabilité** : Architecture modulaire et maintenable
5. **Compliance** : Validation KYC obligatoire pour tous les vendeurs
6. **Automatisation** : Calculs commissions et workflows automatisés

### 1.3 Technologies

**Frontend** :
- React 18+ avec Hooks
- Tailwind CSS pour le styling
- React Query pour la gestion d'état serveur
- React Router v6 pour le routing
- Framer Motion pour les animations
- Lucide React pour les icônes

**Backend** :
- Deno (runtime JavaScript/TypeScript)
- Base44 SDK v0.8.20
- Fonctions serverless (Deno Deploy)

**Base de données** :
- Base44 (PostgreSQL géré)
- Row-Level Security (RLS) natif
- Indexes automatiques

**Authentification** :
- Base44 Auth (OAuth2)
- Sessions gérées automatiquement
- Rôles et permissions granulaires

**Stockage** :
- Base44 File Storage (images, documents KYC)
- URLs publiques et privées

**Communications** :
- Emails via Base44 Core Integrations
- Notifications in-app (entité NotificationVendeur)
- Push Notifications PWA (optionnel)

---

## 2. Architecture Base44-Centrée

### 2.1 Principe Fondamental

**Base44 Users = Source Unique de Vérité**

Tous les utilisateurs du système (admins, sous-admins, vendeurs) sont des enregistrements dans l'entité `User` de Base44.

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE BASE44                       │
└─────────────────────────────────────────────────────────────┘

Base44 User (id, email, role)
      ↓ (user_id - lien obligatoire)
    Seller (toutes les données vendeur)
      ↓
   ┌──────────────────────────────────────────┐
   │                                          │
   ↓                                          ↓
CommandeVendeur                            Vente
   ↓                                          ↓
DemandePaiement                        MouvementStock
   ↓                                          ↓
TicketSupport                          PaiementCommission
   ↓
NotificationVendeur
```

### 2.2 Avantages de cette Architecture

1. **Authentification Centralisée**
   - Un seul système de login
   - Sessions sécurisées gérées par Base44
   - Pas de gestion manuelle de tokens

2. **Intégrité des Données**
   - Impossible de créer un Seller sans User
   - Pas de vendeurs "orphelins"
   - Liaison stricte 1:1

3. **Gestion des Rôles Simplifiée**
   - Rôles définis au niveau User (`admin`, `sous_admin`, `user`)
   - Permissions granulaires via RLS
   - Changement de rôle = une seule mise à jour

4. **Audit Automatique**
   - Base44 track automatiquement `created_by`
   - Historique des modifications
   - Traçabilité native

### 2.3 Flux de Données

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUX DE DONNÉES                          │
└─────────────────────────────────────────────────────────────┘

1. Authentification
   Frontend → base44.auth.me() → Base44 Auth → User

2. Autorisation
   User.role + Seller.seller_status → Contrôles d'accès

3. Données Métier
   Frontend → base44.entities.* → RLS Check → PostgreSQL

4. Audit
   Toute action critique → JournalAudit

5. Notifications
   Événements → NotificationVendeur + Email + Push
```

---

## 3. Composants Système

### 3.1 Frontend (React)

**Structure** :
```
src/
├── pages/              # Pages principales
│   ├── admin/          # Pages admin
│   ├── vendeur/        # Pages vendeur
│   └── public/         # Pages publiques (login, etc.)
├── components/         # Composants réutilisables
│   ├── ui/             # Composants UI de base (shadcn)
│   ├── dashboard/      # Composants dashboard
│   ├── vendeurs/       # Composants gestion vendeurs
│   └── produits/       # Composants gestion produits
├── lib/                # Utilitaires
├── api/                # Configuration SDK Base44
└── Layout.jsx          # Layout principal avec sidebar
```

**Fonctionnalités clés** :
- Routing avec React Router v6
- État serveur avec React Query (cache, refetch auto)
- Composants UI avec shadcn/ui + Tailwind
- Formulaires avec React Hook Form
- Animations avec Framer Motion

### 3.2 Backend (Deno Functions)

**Structure** :
```
functions/
├── auth/               # Authentification
│   ├── registerVendeur.js
│   ├── verifyEmailCode.js
│   └── loginUser.js
├── vendeurs/           # Gestion vendeurs
│   ├── createSellerComplete.js
│   ├── deleteSellerComplete.js
│   └── getAllVendeurs.js
├── kyc/                # Validation KYC
│   ├── updateKYCDocuments.js
│   ├── validateKYC.js
│   └── resubmitKYC.js
├── commandes/          # Gestion commandes
│   ├── createCommandeVendeur.js
│   └── createVente.js
├── paiements/          # Commissions
│   └── processPaymentRequest.js
├── audit/              # Maintenance
│   ├── systemIntegrityAudit.js
│   ├── syncSellerUsers.js
│   └── repairSellerConsistency.js
└── utils/              # Utilitaires
    └── hashPassword.js
```

**Caractéristiques** :
- Déployées sur Deno Deploy (serverless)
- Timeout 30s par défaut
- Logs automatiques avec niveaux (info, warn, error)
- Validation avec `base44.auth.me()` systématique

### 3.3 Base de Données (Entités Base44)

**Catégories d'entités** :

1. **Utilisateurs et Vendeurs**
   - User (Base44 intégré)
   - Seller
   - SousAdmin
   - AdminPermissions

2. **Produits et Catalogue**
   - Produit
   - Categorie
   - MouvementStock

3. **Commandes et Ventes**
   - CommandeVendeur
   - Vente
   - RetourProduit

4. **Livraisons**
   - Livraison
   - Zone

5. **Commissions et Paiements**
   - DemandePaiementVendeur
   - PaiementCommission

6. **Support et Communication**
   - NotificationVendeur
   - TicketSupport
   - FaqItem

7. **Candidatures**
   - CandidatureVendeur

8. **Audit et Configuration**
   - JournalAudit
   - ConfigApp

---

## 4. Patterns et Principes de Conception

### 4.1 Single Source of Truth

**Principe** : Chaque donnée a une seule source autoritaire.

**Exemples** :
- **Email vendeur** : Stocké dans `Seller.email` (source) ET `User.email` (synchronisé)
- **Statut vendeur** : `Seller.seller_status` (source unique)
- **Authentification** : `User` Base44 (source unique)

**Éviter** :
- Dupliquer données critiques sans synchronisation
- Stocker l'état dérivable (calculer à la volée)

### 4.2 State Machine (Machine à États)

**Principe** : Les transitions d'états sont strictes et tracées.

**Exemple avec `seller_status`** :
```
pending_verification → kyc_required → kyc_pending 
  → kyc_approved_training_required → active_seller
```

**Règles** :
- Impossible de sauter une étape
- Chaque transition = fonction dédiée
- Audit de chaque changement

### 4.3 Dénormalisation Stratégique

**Principe** : Dupliquer certaines données pour optimiser les requêtes.

**Exemples** :
- `CommandeVendeur.vendeur_nom` (dupliqué de `Seller.nom_complet`)
- `Vente.produit_nom` (dupliqué de `Produit.nom`)

**Avantages** :
- Requêtes plus rapides (pas de JOIN)
- Historique préservé (si Seller supprimé, nom reste)

**Inconvénients** :
- Synchronisation nécessaire lors de mise à jour
- Consommation mémoire légèrement supérieure

### 4.4 Event-Driven Notifications

**Principe** : Les événements déclenchent automatiquement des notifications.

**Workflow** :
```
Action (ex: KYC validé)
  → Création NotificationVendeur
  → Envoi Email (parallèle)
  → Push Notification (optionnel)
  → Audit Log
```

**Avantages** :
- Cohérence des notifications
- Découplage logique métier / communication
- Traçabilité complète

### 4.5 Optimistic UI Updates

**Principe** : Mise à jour UI avant confirmation serveur.

**Exemple** :
```javascript
// Mutation React Query avec optimistic update
const mutation = useMutation({
  mutationFn: (data) => base44.entities.Seller.update(id, data),
  onMutate: async (newData) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries(['seller', id]);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['seller', id]);
    
    // Optimistically update
    queryClient.setQueryData(['seller', id], (old) => ({
      ...old,
      ...newData
    }));
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['seller', id], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries(['seller', id]);
  }
});
```

**Avantages** :
- UX réactive
- Feedback immédiat
- Rollback automatique en cas d'erreur

---

## 5. Sécurité Multi-Niveaux

### 5.1 Niveau 1 : Authentification Base44

**Implémentation** :
```javascript
const user = await base44.auth.me();

if (!user) {
  // Rediriger vers login
  base44.auth.redirectToLogin();
}
```

**Protection** :
- Sessions chiffrées
- Expiration automatique
- Refresh tokens gérés

### 5.2 Niveau 2 : Autorisation par Rôle

**Implémentation** :
```javascript
if (!['admin', 'sous_admin'].includes(user.role)) {
  return Response.json({ error: 'Non autorisé' }, { status: 403 });
}
```

**Rôles** :
- `admin` : Accès total
- `sous_admin` : Accès configurable
- `user` : Vendeur, accès limité

### 5.3 Niveau 3 : Statut Vendeur

**Implémentation** :
```javascript
const seller = await base44.entities.Seller.filter({ email: user.email });

if (seller[0]?.seller_status !== 'active_seller') {
  // Bloquer accès catalogue
}
```

**Contrôle granulaire** :
- Accès catalogue si `active_seller`
- Création commande si `active_seller`
- Demande paiement si `active_seller`

### 5.4 Niveau 4 : Row-Level Security (RLS)

**Implémentation** : Règles au niveau base de données

**Exemple** :
```json
{
  "read": {
    "$or": [
      { "data.vendeur_email": "{{user.email}}" },
      { "user_condition": { "role": "admin" } }
    ]
  }
}
```

**Protection** :
- Impossible de contourner via API
- Appliquée même avec service role (sauf bypass explicite)

---

## 6. Performance et Optimisation

### 6.1 Caching Frontend (React Query)

**Configuration** :
```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  }
});
```

**Stratégies** :
- Cache en mémoire avec expiration
- Invalidation ciblée après mutations
- Prefetch pour pages suivantes

### 6.2 Indexes Base de Données

**Recommandés** :
- `Seller.email` (unique)
- `Seller.user_id` (unique, foreign key)
- `Seller.seller_status`
- `CommandeVendeur.statut`
- `Vente.date_vente`
- `Produit.reference` (unique)

### 6.3 Pagination

**Implémentation** :
```javascript
const { data, hasNextPage, fetchNextPage } = useInfiniteQuery({
  queryKey: ['sellers'],
  queryFn: ({ pageParam = 0 }) => 
    base44.entities.Seller.list('-created_date', 50, pageParam),
  getNextPageParam: (lastPage, pages) => 
    lastPage.length === 50 ? pages.length * 50 : undefined
});
```

**Bénéfices** :
- Chargement progressif
- Mémoire optimisée
- UX fluide

---

## 7. Monitoring et Observabilité

### 7.1 Logs Backend

**Niveaux** :
- `console.log()` : Info
- `console.warn()` : Warning
- `console.error()` : Error

**Bonnes pratiques** :
```javascript
console.log(`✅ Seller created: ${seller.id}`);
console.warn(`⚠️ Low stock: Product ${produit.nom}`);
console.error(`❌ Validation failed: ${error.message}`);
```

### 7.2 Audit Trail

**Implémentation** :
```javascript
await base44.asServiceRole.entities.JournalAudit.create({
  action: "Vendeur créé",
  module: "vendeur",
  details: `${nom_complet} (${email}) créé par ${admin_email}`,
  utilisateur: admin_email,
  entite_id: seller.id,
  donnees_apres: JSON.stringify(seller)
});
```

**Utilisation** :
- Débogage incidents
- Conformité réglementaire
- Analyse comportementale

### 7.3 Analytics (Optionnel)

**Implémentation** :
```javascript
base44.analytics.track({
  eventName: "product_viewed",
  properties: {
    product_id,
    seller_id,
    category
  }
});
```

**Métriques possibles** :
- Pages vues
- Actions vendeurs
- Taux conversion
- Performance produits

---

## 8. Déploiement et Environnements

### 8.1 Environnements

1. **Développement** : Local avec Vite
2. **Staging** : Base44 Preview (optionnel)
3. **Production** : Base44 Hosting

### 8.2 CI/CD

**Automatique via Base44** :
- Push sur Git → Build automatique
- Tests de lint (Deno)
- Déploiement backend functions
- Build frontend optimisé

### 8.3 Configuration

**Variables d'environnement** :
- `BASE44_APP_ID` : Auto-injecté
- `APP_URL` : URL de l'application (défini manuellement)

**Secrets** :
- Gérés via Dashboard Base44 → Settings → Secrets
- Accessibles dans fonctions via `Deno.env.get("SECRET_NAME")`

---

## 9. Évolutivité

### 9.1 Ajout de Nouvelles Fonctionnalités

**Checklist** :
1. Créer entité (si besoin) : `entities/NouvelleEntite.json`
2. Définir RLS approprié
3. Créer fonction(s) backend : `functions/nouvelleAction.js`
4. Créer page/composant frontend
5. Ajouter route dans `App.jsx`
6. Tester avec `test_backend_function`
7. Mettre à jour documentation

### 9.2 Internationalisation (Future)

**Préparation** :
- Tous les textes UI dans constants
- Dates avec `date-fns` (locale-aware)
- Devise configurable (`ConfigApp`)

### 9.3 Multi-Tenancy (Future)

**Potentiel** :
- Ajouter `entreprise_id` à toutes les entités
- Isoler données par entreprise via RLS
- Un déploiement, plusieurs clients

---

## Prochaines étapes

Consultez les documents suivants pour approfondir :
- [02 - Rôles et Permissions](02_ROLES_PERMISSIONS.md)
- [03 - Modèle de Données](03_MODELE_DONNEES.md)
- [07 - Fonctions Backend](07_FONCTIONS_BACKEND.md)