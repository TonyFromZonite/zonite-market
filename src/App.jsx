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
import Layout from './layout';

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
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route
        path="/SystemIntegrity"
        element={
          <LayoutWrapper currentPageName="SystemIntegrity">
            <SystemIntegrity />
          </LayoutWrapper>
        }
      />
      <Route
        path="/GestionZones"
        element={
          <LayoutWrapper currentPageName="GestionZones">
            <GestionZones />
          </LayoutWrapper>
        }
      />
      <Route
        path="/GestionCoursiers"
        element={
          <LayoutWrapper currentPageName="GestionCoursiers">
            <GestionCoursiers />
          </LayoutWrapper>
        }
      />
      <Route
        path="/DataConsistency"
        element={
          <LayoutWrapper currentPageName="DataConsistency">
            <DataConsistency />
          </LayoutWrapper>
        }
      />
      <Route
        path="/AuditSysteme"
        element={
          <LayoutWrapper currentPageName="AuditSysteme">
            <AuditSysteme />
          </LayoutWrapper>
        }
      />
      <Route
        path="/AuditComptes"
        element={
          <LayoutWrapper currentPageName="AuditComptes">
            <AuditComptes />
          </LayoutWrapper>
        }
      />
      <Route
        path="/AuditComplet"
        element={
          <LayoutWrapper currentPageName="AuditComplet">
            <AuditComplet />
          </LayoutWrapper>
        }
      />
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