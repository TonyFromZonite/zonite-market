/**
 * Hook centralisé de gestion des sessions.
 * Fournit des helpers pour vérifier et lire les sessions de chaque type d'utilisateur.
 */

export function getAdminSession() {
  try {
    const data = sessionStorage.getItem("admin_session");
    return data ? JSON.parse(data) : null;
  } catch (_) { return null; }
}

export function getSousAdminSession() {
  try {
    const data = sessionStorage.getItem("sous_admin");
    return data ? JSON.parse(data) : null;
  } catch (_) { return null; }
}

export function getVendeurSession() {
  try {
    const data = sessionStorage.getItem("vendeur_session");
    return data ? JSON.parse(data) : null;
  } catch (_) { return null; }
}

/**
 * Retourne le type de session active : 'admin' | 'sous_admin' | 'vendeur' | null
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

/**
 * Protège une page admin : redirige vers /Connexion si pas de session admin ou sous_admin.
 * À utiliser dans useEffect.
 */
export function requireAdminSession(redirectFn) {
  const admin = getAdminSession();
  const sousAdmin = getSousAdminSession();
  if (!admin && !sousAdmin) {
    redirectFn();
    return false;
  }
  return true;
}

/**
 * Protège une page sous-admin : redirige si pas de session sous_admin.
 */
export function requireSousAdminSession(redirectFn) {
  const sousAdmin = getSousAdminSession();
  if (!sousAdmin) {
    redirectFn();
    return false;
  }
  return true;
}

/**
 * Protège une page vendeur : redirige si pas de session vendeur.
 */
export function requireVendeurSession(redirectFn) {
  const vendeur = getVendeurSession();
  if (!vendeur) {
    redirectFn();
    return false;
  }
  return true;
}

/**
 * Vérifie qu'un sous-admin a la permission pour une page donnée.
 */
export function hasPermission(sousAdminData, page) {
  if (!sousAdminData || !page) return false;
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