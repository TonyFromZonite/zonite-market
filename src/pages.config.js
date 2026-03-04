/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AideVendeur from './pages/AideVendeur';
import Candidature from './pages/Candidature';
import CatalogueVendeur from './pages/CatalogueVendeur';
import Categories from './pages/Categories';
import Commandes from './pages/Commandes';
import CommandesVendeurs from './pages/CommandesVendeurs';
import Commissions from './pages/Commissions';
import ConfigurationAdminPassword from './pages/ConfigurationAdminPassword';
import Connexion from './pages/Connexion';
import DemandePaiement from './pages/DemandePaiement';
import EnAttenteValidation from './pages/EnAttenteValidation';
import EspaceSousAdmin from './pages/EspaceSousAdmin';
import EspaceVendeur from './pages/EspaceVendeur';
import GestionCandidatures from './pages/GestionCandidatures';
import GestionCommandes from './pages/GestionCommandes';
import GestionKYC from './pages/GestionKYC';
import GestionSousAdmins from './pages/GestionSousAdmins';
import InscriptionVendeur from './pages/InscriptionVendeur';
import JournalAudit from './pages/JournalAudit';
import Livraisons from './pages/Livraisons';
import MesCommandesVendeur from './pages/MesCommandesVendeur';
import NotificationsVendeur from './pages/NotificationsVendeur';
import NouvelleCommandeVendeur from './pages/NouvelleCommandeVendeur';
import NouvelleVente from './pages/NouvelleVente';
import PaiementsVendeurs from './pages/PaiementsVendeurs';
import Produits from './pages/Produits';
import ProfilVendeur from './pages/ProfilVendeur';
import RapportsVentes from './pages/RapportsVentes';
import RetoursAdmin from './pages/RetoursAdmin';
import SupportAdmin from './pages/SupportAdmin';
import TableauDeBord from './pages/TableauDeBord';
import TableauDeBordVendeur from './pages/TableauDeBordVendeur';
import Vendeurs from './pages/Vendeurs';
import ConfigurationApp from './pages/ConfigurationApp';
import VideoFormation from './pages/VideoFormation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AideVendeur": AideVendeur,
    "Candidature": Candidature,
    "CatalogueVendeur": CatalogueVendeur,
    "Categories": Categories,
    "Commandes": Commandes,
    "CommandesVendeurs": CommandesVendeurs,
    "Commissions": Commissions,
    "ConfigurationAdminPassword": ConfigurationAdminPassword,
    "Connexion": Connexion,
    "DemandePaiement": DemandePaiement,
    "EnAttenteValidation": EnAttenteValidation,
    "EspaceSousAdmin": EspaceSousAdmin,
    "EspaceVendeur": EspaceVendeur,
    "GestionCandidatures": GestionCandidatures,
    "GestionCommandes": GestionCommandes,
    "GestionKYC": GestionKYC,
    "GestionSousAdmins": GestionSousAdmins,
    "InscriptionVendeur": InscriptionVendeur,
    "JournalAudit": JournalAudit,
    "Livraisons": Livraisons,
    "MesCommandesVendeur": MesCommandesVendeur,
    "NotificationsVendeur": NotificationsVendeur,
    "NouvelleCommandeVendeur": NouvelleCommandeVendeur,
    "NouvelleVente": NouvelleVente,
    "PaiementsVendeurs": PaiementsVendeurs,
    "Produits": Produits,
    "ProfilVendeur": ProfilVendeur,
    "RapportsVentes": RapportsVentes,
    "RetoursAdmin": RetoursAdmin,
    "SupportAdmin": SupportAdmin,
    "TableauDeBord": TableauDeBord,
    "TableauDeBordVendeur": TableauDeBordVendeur,
    "Vendeurs": Vendeurs,
    "ConfigurationApp": ConfigurationApp,
    "VideoFormation": VideoFormation,
}

export const pagesConfig = {
    mainPage: "TableauDeBord",
    Pages: PAGES,
    Layout: __Layout,
};