import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SystemIntegrity from './pages/SystemIntegrity';
import GestionZones from './pages/GestionZones';
import GestionCoursiers from './pages/GestionCoursiers';
import DataConsistency from './pages/DataConsistency';
import AuditSysteme from './pages/AuditSysteme';
import AuditComptes from './pages/AuditComptes';
import AuditComplet from './pages/AuditComplet';
import Connexion from './pages/Connexion';
import TableauDeBord from './pages/TableauDeBord';
import NouvelleVente from './pages/NouvelleVente';
import Commandes from './pages/Commandes';
import GestionCommandes from './pages/GestionCommandes';
import CommandesVendeurs from './pages/CommandesVendeurs';
import Produits from './pages/Produits';
import Vendeurs from './pages/Vendeurs';
import SupportAdmin from './pages/SupportAdmin';
import JournalAudit from './pages/JournalAudit';
import GestionPermissionsAdmin from './pages/GestionPermissionsAdmin';
import GestionSousAdmins from './pages/GestionSousAdmins';
import ConfigurationApp from './pages/ConfigurationApp';
import EspaceVendeur from './pages/EspaceVendeur';
import InscriptionVendeur from './pages/InscriptionVendeur';
import VideoFormation from './pages/VideoFormation';
import CatalogueVendeur from './pages/CatalogueVendeur';
import NouvelleCommandeVendeur from './pages/NouvelleCommandeVendeur';
import MesCommandesVendeur from './pages/MesCommandesVendeur';
import ProfilVendeur from './pages/ProfilVendeur';
import DemandePaiement from './pages/DemandePaiement';
import NotificationsVendeur from './pages/NotificationsVendeur';
import AideVendeur from './pages/AideVendeur';
import EspaceSousAdmin from './pages/EspaceSousAdmin';
import Layout from '../layout';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Connexion" replace />} />
      
      {/* Pages Admin */}
      <Route path="/TableauDeBord" element={<Layout currentPageName="TableauDeBord"><TableauDeBord /></Layout>} />
      <Route path="/NouvelleVente" element={<Layout currentPageName="NouvelleVente"><NouvelleVente /></Layout>} />
      <Route path="/Commandes" element={<Layout currentPageName="Commandes"><Commandes /></Layout>} />
      <Route path="/GestionCommandes" element={<Layout currentPageName="GestionCommandes"><GestionCommandes /></Layout>} />
      <Route path="/CommandesVendeurs" element={<Layout currentPageName="CommandesVendeurs"><CommandesVendeurs /></Layout>} />
      <Route path="/Produits" element={<Layout currentPageName="Produits"><Produits /></Layout>} />
      <Route path="/Vendeurs" element={<Layout currentPageName="Vendeurs"><Vendeurs /></Layout>} />
      <Route path="/GestionZones" element={<Layout currentPageName="GestionZones"><GestionZones /></Layout>} />
      <Route path="/GestionCoursiers" element={<Layout currentPageName="GestionCoursiers"><GestionCoursiers /></Layout>} />
      <Route path="/SupportAdmin" element={<Layout currentPageName="SupportAdmin"><SupportAdmin /></Layout>} />
      <Route path="/JournalAudit" element={<Layout currentPageName="JournalAudit"><JournalAudit /></Layout>} />
      <Route path="/AuditComplet" element={<Layout currentPageName="AuditComplet"><AuditComplet /></Layout>} />
      <Route path="/AuditSysteme" element={<Layout currentPageName="AuditSysteme"><AuditSysteme /></Layout>} />
      <Route path="/AuditComptes" element={<Layout currentPageName="AuditComptes"><AuditComptes /></Layout>} />
      <Route path="/SystemIntegrity" element={<Layout currentPageName="SystemIntegrity"><SystemIntegrity /></Layout>} />
      <Route path="/DataConsistency" element={<Layout currentPageName="DataConsistency"><DataConsistency /></Layout>} />
      <Route path="/GestionPermissionsAdmin" element={<Layout currentPageName="GestionPermissionsAdmin"><GestionPermissionsAdmin /></Layout>} />
      <Route path="/GestionSousAdmins" element={<Layout currentPageName="GestionSousAdmins"><GestionSousAdmins /></Layout>} />
      <Route path="/ConfigurationApp" element={<Layout currentPageName="ConfigurationApp"><ConfigurationApp /></Layout>} />
      
      {/* Pages Vendeurs (sans Layout) */}
      <Route path="/Connexion" element={<Connexion />} />
      <Route path="/EspaceVendeur" element={<EspaceVendeur />} />
      <Route path="/InscriptionVendeur" element={<InscriptionVendeur />} />
      <Route path="/VideoFormation" element={<VideoFormation />} />
      <Route path="/CatalogueVendeur" element={<CatalogueVendeur />} />
      <Route path="/NouvelleCommandeVendeur" element={<NouvelleCommandeVendeur />} />
      <Route path="/MesCommandesVendeur" element={<MesCommandesVendeur />} />
      <Route path="/ProfilVendeur" element={<ProfilVendeur />} />
      <Route path="/DemandePaiement" element={<DemandePaiement />} />
      <Route path="/NotificationsVendeur" element={<NotificationsVendeur />} />
      <Route path="/AideVendeur" element={<AideVendeur />} />
      <Route path="/EspaceSousAdmin" element={<EspaceSousAdmin />} />
      
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App