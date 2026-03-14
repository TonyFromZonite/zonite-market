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
 * Check if seller can access a feature based on their status
 */
export const canAccessFeature = (sellerStatus, feature) => {
  const accessMap = {
    dashboard: {
      [SELLER_STATUSES.PENDING_VERIFICATION]: false,
      [SELLER_STATUSES.KYC_REQUIRED]: true,
      [SELLER_STATUSES.KYC_PENDING]: true,
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
      [SELLER_STATUSES.KYC_PENDING]: false,
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
      [SELLER_STATUSES.KYC_REQUIRED]: true,
      [SELLER_STATUSES.KYC_PENDING]: true,
      [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: true,
      [SELLER_STATUSES.ACTIVE_SELLER]: true,
    },
  };

  return accessMap[feature]?.[sellerStatus] ?? false;
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
 * Get the modal to show based on seller status
 */
export const getRequiredModal = (sellerStatus) => {
  const modals = {
    [SELLER_STATUSES.PENDING_VERIFICATION]: "email_verification",
    [SELLER_STATUSES.KYC_REQUIRED]: "kyc_submission",
    [SELLER_STATUSES.KYC_PENDING]: "kyc_pending",
    [SELLER_STATUSES.KYC_APPROVED_TRAINING_REQUIRED]: "training_required",
  };

  return modals[sellerStatus] || null;
};