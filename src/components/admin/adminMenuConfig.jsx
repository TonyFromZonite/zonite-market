import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  ClipboardList, Shield, MessageSquare, UserCog, Settings,
  Database, ScrollText, FileCheck, MapPin, Bike
} from "lucide-react";

/**
 * Configuration centralisée du menu admin.
 * Pour ajouter une page : ajouter UNE entrée ici, c'est tout.
 * 
 * sousAdminModule : clé de permission requise pour les sous-admins.
 *   Si absent → page réservée aux admins principaux uniquement.
 */
export const ADMIN_MENU = [
  {
    id: "dashboard",
    label: "Tableau de Bord",
    icon: LayoutDashboard,
    page: "TableauDeBord",
    roles: ["admin", "sous_admin"],
  },
  {
    id: "nouvelle_vente",
    label: "Nouvelle Vente",
    icon: ShoppingCart,
    page: "NouvelleVente",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "NouvelleVente",
  },
  {
    id: "commandes_admin",
    label: "Commandes Admin",
    icon: ClipboardList,
    page: "Commandes",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "Commandes",
  },
  {
    id: "gestion_livraisons",
    label: "Gestion Livraisons",
    icon: Truck,
    page: "GestionCommandes",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "GestionCommandes",
  },
  {
    id: "commandes_vendeurs",
    label: "Commandes Vendeurs",
    icon: ShoppingCart,
    page: "CommandesVendeurs",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "CommandesVendeurs",
    badge: "commandes",
  },
  {
    id: "produits",
    label: "Produits",
    icon: Package,
    page: "Produits",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "Produits",
  },
  {
    id: "vendeurs",
    label: "Vendeurs",
    icon: Users,
    page: "Vendeurs",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "Vendeurs",
  },
  {
    id: "kyc",
    label: "Validation KYC",
    icon: FileCheck,
    page: "GestionKYC",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "GestionKYC",
    badge: "kyc",
  },
  {
    id: "zones",
    label: "Zones Livraison",
    icon: MapPin,
    page: "GestionZones",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "GestionZones",
  },
  {
    id: "coursiers",
    label: "Coursiers",
    icon: Bike,
    page: "GestionCoursiers",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "GestionCoursiers",
  },
  {
    id: "support",
    label: "Support Vendeurs",
    icon: MessageSquare,
    page: "SupportAdmin",
    roles: ["admin", "sous_admin"],
    sousAdminModule: "SupportAdmin",
  },
  {
    id: "audit",
    label: "Journal d'Audit",
    icon: ScrollText,
    page: "JournalAudit",
    roles: ["admin"],
  },
  {
    id: "audit_complet",
    label: "Audit & Intégrité",
    icon: Database,
    page: "AuditComplet",
    roles: ["admin"],
  },
  {
    id: "permissions",
    label: "Permissions Admin",
    icon: Shield,
    page: "GestionPermissionsAdmin",
    roles: ["admin"],
  },
  {
    id: "sous_admins",
    label: "Sous-Admins",
    icon: UserCog,
    page: "GestionSousAdmins",
    roles: ["admin"],
  },
  {
    id: "config",
    label: "Configuration App",
    icon: Settings,
    page: "ConfigurationApp",
    roles: ["admin"],
  },
];

/**
 * Filtre les items de menu selon le rôle et les permissions.
 * @param {string} role - 'admin' | 'sous_admin'
 * @param {string[]} permissions - liste des modules autorisés (sous-admins)
 */
export function getMenuVisible(role, permissions = []) {
  return ADMIN_MENU.filter((item) => {
    if (role === "admin") return true;
    if (role === "sous_admin") {
      if (item.id === "dashboard") return true; // toujours visible
      if (!item.sousAdminModule) return false;
      return permissions.includes(item.sousAdminModule);
    }
    return false;
  });
}