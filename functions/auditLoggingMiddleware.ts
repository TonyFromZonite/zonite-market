/**
 * HELPER POUR AUDIT LOGGING
 * À importer et utiliser dans tous les backend functions critiques
 */

export async function logAudit(base44, {
  action,
  module,
  details,
  utilisateur,
  entite_id,
  donnees_avant,
  donnees_apres,
}) {
  try {
    await base44.asServiceRole.entities.JournalAudit.create({
      action,
      module,
      details,
      utilisateur,
      entite_id,
      donnees_avant: donnees_avant ? JSON.stringify(donnees_avant) : null,
      donnees_apres: donnees_apres ? JSON.stringify(donnees_apres) : null,
    });
  } catch (err) {
    console.error('Audit logging failed:', err.message);
    // Ne pas bloquer sur erreur d'audit
  }
}

/**
 * Rate limiter simple en mémoire
 * Attention: perd les données à redémarrage du fonction
 * Pour prod: utiliser Redis ou équivalent
 */
const rateLimitMap = new Map();

export function checkRateLimit(identifier, maxRequests = 3, windowMs = 3600000) {
  const now = Date.now();
  const key = identifier;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }

  const requests = rateLimitMap.get(key);
  const recentRequests = requests.filter(time => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  recentRequests.push(now);
  rateLimitMap.set(key, recentRequests);

  return { allowed: true, remaining: maxRequests - recentRequests.length };
}

/**
 * Validation email basique
 */
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Sanitize string input (XSS prevention)
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 500); // Max 500 chars
}