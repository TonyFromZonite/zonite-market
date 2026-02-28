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
import Commandes from './pages/Commandes';
import Commissions from './pages/Commissions';
import JournalAudit from './pages/JournalAudit';
import Livraisons from './pages/Livraisons';
import NouvelleVente from './pages/NouvelleVente';
import Produits from './pages/Produits';
import TableauDeBord from './pages/TableauDeBord';
import Vendeurs from './pages/Vendeurs';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Commandes": Commandes,
    "Commissions": Commissions,
    "JournalAudit": JournalAudit,
    "Livraisons": Livraisons,
    "NouvelleVente": NouvelleVente,
    "Produits": Produits,
    "TableauDeBord": TableauDeBord,
    "Vendeurs": Vendeurs,
}

export const pagesConfig = {
    mainPage: "TableauDeBord",
    Pages: PAGES,
    Layout: __Layout,
};