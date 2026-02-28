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
import TableauDeBord from './pages/TableauDeBord';
import NouvelleVente from './pages/NouvelleVente';
import Commandes from './pages/Commandes';
import Produits from './pages/Produits';
import Vendeurs from './pages/Vendeurs';
import Livraisons from './pages/Livraisons';
import Commissions from './pages/Commissions';
import JournalAudit from './pages/JournalAudit';
import __Layout from './Layout.jsx';


export const PAGES = {
    "TableauDeBord": TableauDeBord,
    "NouvelleVente": NouvelleVente,
    "Commandes": Commandes,
    "Produits": Produits,
    "Vendeurs": Vendeurs,
    "Livraisons": Livraisons,
    "Commissions": Commissions,
    "JournalAudit": JournalAudit,
}

export const pagesConfig = {
    mainPage: "TableauDeBord",
    Pages: PAGES,
    Layout: __Layout,
};