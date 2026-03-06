/**
 * Module centralisé de gestion des sessions.
 * SOURCE DE VÉRITÉ pour toutes les vérifications de session dans l'app.
 * 
 * Sessions stockées dans sessionStorage :
 *   - "admin_session"   → admin principal
 *   - "sous_admin"      → sous-administrateur
 *   - "vendeur_session" → vendeur
 */

import { createPageUrl } from "@/utils";

// ─── Lecture des sessions ────────────────────────────────────────────────────

export function getAdminSession() {
  try {
    const data = sessionStorage.getItem("admin_session");
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed?.role === 'admin' ? parsed : null;
  } catch (_) { return null; }
}

export function getSousAdminSession() {
  try {
    const data = sessionStorage.getItem("sous_admin");
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed?.role === 'sous_admin' ? parsed : null;
  } catch (_) { return null; }
}

export function getVendeurSession() {
  try {
    const data = sessionStorage.getItem("vendeur_session");
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed?.role === 'vendeur' ? parsed : null;
  } catch (_) { return null; }
}

/**
 * Retourne la session active : { type, data } ou null
 */
export function getActiveSession() {
  const admin = getAdminSession();
  if (admin) return { type: 'admin', data: admin };

  const sousAdmin = getSousAdminSession();
  if (sousAdmin) return { type: 'sous_admin', data: sousAdmin };

  const vendeur = getVendeurSession();
  if (vendeur) return { type: 'vendeur', data: vendeur };

  return null;
}

// ─── Guards (à utiliser dans useEffect) ─────────────────────────────────────

/**
 * Protège une page admin/sous-admin.
 * Redirige vers /Connexion si aucun admin ou sous-admin connecté.
 * Retourne true si l'accès est autorisé.
 */
export function requireAdminOrSousAdmin() {
  const admin = getAdminSession();
  const sousAdmin = getSousAdminSession();
  if (!admin && !sousAdmin) {
    window.location.href = createPageUrl("Connexion");
    return false;
  }
  return true;
}

/**
 * Protège une page sous-admin seulement (pas l'admin principal).
 * Redirige si pas de session sous_admin.
 */
export function requireSousAdminSession() {
  const sousAdmin = getSousAdminSession();
  if (!sousAdmin) {
    window.location.href = createPageUrl("Connexion");
    return false;
  }
  return true;
}

/**
 * Protège une page vendeur.
 * Redirige vers /Connexion si pas de session vendeur.
 */
export function requireVendeurSession() {
  const vendeur = getVendeurSession();
  if (!vendeur) {
    window.location.href = createPageUrl("Connexion");
    return false;
  }
  return true;
}

/**
 * Vérifie qu'un sous-admin a la permission pour une page donnée.
 * L'admin principal a toujours accès.
 */
export function hasPermission(sousAdminData, page) {
  if (!page) return false;
  // Admin principal : accès total
  if (getAdminSession()) return true;
  // Sous-admin : vérifier les permissions
  if (!sousAdminData) return false;
  return (sousAdminData.permissions || []).includes(page);
}

/**
 * Déconnexion complète (toutes sessions)
 */
export function clearAllSessions() {
  sessionStorage.removeItem("admin_session");
  sessionStorage.removeItem("sous_admin");
  sessionStorage.removeItem("vendeur_session");
}