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
 * Rate limiter basé sur JournalAudit
 * Persiste à travers les redémarrages
 * À utiliser avec base44.asServiceRole pour vérifier les tentatives récentes
 */
export async function checkRateLimit(base44, identifier, maxRequests = 5, windowMs = 900000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Récupérer les tentatives récentes du journal d'audit
    const recentAttempts = await base44.asServiceRole.entities.JournalAudit.filter({
      action: `rate_limit_check:${identifier}`,
      created_date: { $gte: new Date(windowStart).toISOString() }
    });

    if (recentAttempts.length >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Enregistrer cette tentative
    await base44.asServiceRole.entities.JournalAudit.create({
      action: `rate_limit_check:${identifier}`,
      module: 'systeme',
      details: `Rate limit check for ${identifier}`,
      utilisateur: identifier,
    }).catch(() => {}); // Ne pas bloquer si l'audit échoue

    return { allowed: true, remaining: maxRequests - recentAttempts.length - 1 };
  } catch (err) {
    console.error('Rate limit check error:', err.message);
    // En cas d'erreur, laisser passer mais logger
    return { allowed: true, remaining: maxRequests };
  }
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