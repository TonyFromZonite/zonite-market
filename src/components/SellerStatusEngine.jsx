/**
 * Seller Status Engine
 * Controls access to features based on seller_status
 */

export const SELLER_STATUSES = {
  PENDING_VERIFICATION: "pending_verification",
  KYC_REQUIRED: "kyc_required",
  KYC_PENDING: "kyc_pending",
  KYC_APPROVED_TRAINING_REQUIRED: "kyc_approved_training_required",
  ACTIVE_SELLER: "active_seller",
};

export const STATUS_LABELS = {
  pending_verification: "Email à vérifier",
  kyc_required: "Vérification d'identité requise",
  kyc_pending: "Dossier KYC en révision",
  kyc_approved_training_required: "Formation obligatoire",
  active_seller: "Vendeur actif",
};

/**
 * Check if seller can access a feature based on their status and training completion
 * @param {string} sellerStatus - The seller's current status
 * @param {string} feature - The feature to check access for
 * @param {boolean} trainingCompleted - Whether seller has completed training
 * @returns {boolean} - True if seller can access the feature
 */
export const canAccessFeature = (sellerStatus, feature, trainingCompleted = false) => {
  const accessMap = {
    // dashboard = tableau de bord, profil, notifs, support
    dashboard: {
      [SELLER_STATUSES.PENDING_VERIFICATION]: false,
      [SELLER_STATUSES.KYC_REQUIRED]: true,  // ✅ accès pour soumettre KYC via modal
      [SELLER_STATUSES.KYC_PENDING]: true,  // ✅ accès dès le KYC soumis
      [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: true,
      [SELLER_STATUSES.ACTIVE_SELLER]: true,
    },
    catalog: {
      [SELLER_STATUSES.PENDING_VERIFICATION]: false,
      [SELLER_STATUSES.KYC_REQUIRED]: false,
      [SELLER_STATUSES.KYC_PENDING]: false,
      [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: false,
      [SELLER_STATUSES.ACTIVE_SELLER]: true,
    },
    sales: {
      [SELLER_STATUSES.PENDING_VERIFICATION]: false,
      [SELLER_STATUSES.KYC_REQUIRED]: false,
      [SELLER_STATUSES.KYC_PENDING]: false,  // ❌ bloqué pendant kyc_pending
      [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: false,
      [SELLER_STATUSES.ACTIVE_SELLER]: true,
    },
    training: {
      [SELLER_STATUSES.PENDING_VERIFICATION]: false,
      [SELLER_STATUSES.KYC_REQUIRED]: false,
      [SELLER_STATUSES.KYC_PENDING]: false,
      [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: true,
      [SELLER_STATUSES.ACTIVE_SELLER]: true,
    },
    profile: {
      [SELLER_STATUSES.PENDING_VERIFICATION]: false,
      [SELLER_STATUSES.KYC_REQUIRED]: true,  // ✅ accès au profil pendant soumission KYC
      [SELLER_STATUSES.KYC_PENDING]: true,  // ✅ accès au profil dès kyc_pending
      [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: true,
      [SELLER_STATUSES.ACTIVE_SELLER]: true,
    },
  };

  let canAccess = accessMap[feature]?.[sellerStatus] ?? false;

  // If training is required but not completed, block catalog/sales access
  if (sellerStatus === SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED && !trainingCompleted) {
    if (["catalog", "sales"].includes(feature)) {
      canAccess = false;
    }
  }

  return canAccess;
};

/**
 * Get restriction message for restricted feature
 */
export const getRestrictionMessage = (sellerStatus, feature) => {
  if (canAccessFeature(sellerStatus, feature)) return null;

  const messages = {
    [SELLER_STATUSES.PENDING_VERIFICATION]: "Veuillez vérifier votre email pour continuer.",
    [SELLER_STATUSES.KYC_REQUIRED]: `Veuillez soumettre votre dossier KYC pour accéder à ${feature}.`,
    [SELLER_STATUSES.KYC_PENDING]: "Votre dossier KYC est en révision. Veuillez patienter.",
    [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: "Veuillez regarder et valider la vidéo de formation avant d'accéder aux autres fonctionnalités.",
  };

  return messages[sellerStatus] || "Accès non autorisé.";
};

/**
 * Get the modal to show based on seller status and training completion
 * @param {string} sellerStatus - The seller's current status
 * @param {boolean} trainingCompleted - Whether seller has completed training
 * @returns {string|null} - Modal type to show, or null if no modal needed
 */
export const getRequiredModal = (sellerStatus, trainingCompleted = false) => {
  const modals = {
    [SELLER_STATUSES.PENDING_VERIFICATION]: "email_verification",
    [SELLER_STATUSES.KYC_REQUIRED]: "kyc_submission",
    [SELLER_STATUSES.KYC_PENDING]: "kyc_pending",
    [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: "training_required",
  };

  // Always show training modal if training not completed and seller is at training stage
  if (sellerStatus === SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED && !trainingCompleted) {
    return "training_required";
  }

  return modals[sellerStatus] || null;
};

/**
 * Check if seller needs training modal to appear
 * Used to auto-show training modal when accessing restricted features
 * @param {string} sellerStatus - The seller's current status
 * @param {boolean} trainingCompleted - Whether seller has completed training
 * @returns {boolean} - True if training modal should appear
 */
export const shouldShowTrainingModal = (sellerStatus, trainingCompleted = false) => {
  return sellerStatus === SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED && !trainingCompleted;
};