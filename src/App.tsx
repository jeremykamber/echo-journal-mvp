import { useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Import useLocation
import ReactGA from 'react-ga4'; // Import ReactGA
import { useSettingsStore } from '@/store/settingsStore';
function ThemeEffect() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      // System: remove both, let OS decide
      root.classList.remove('dark');
      root.classList.remove('light');
    }
  }, [theme]);
  return null;
}
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Entry from "./pages/Entry";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { AIProvider } from "./context/AIContext";
import AIChatScreen from '@/components/AIChatScreen';
import SettingsScreen from './pages/Settings';
import Entries from './pages/Entries';
import Stash from './pages/Stash';
import PrivacyInfo from './pages/PrivacyInfo';
import SuccessDialog from './components/SuccessDialog'; // Import SuccessDialog
import useSuccessDialogStore from './store/successDialogStore'; // Import the store
import OnboardingModal from './components/onboarding/OnboardingModal'; // Import OnboardingModal
import { useOnboardingTrigger } from './hooks/useOnboardingTrigger'; // Import onboarding hook
import { Toaster } from 'sonner';
import NotFound from './pages/NotFound';

// Helper component to track page views
function TrackPageViews() {
  const location = useLocation();

  useEffect(() => {
    const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (gaMeasurementId) {
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
      console.log(`GA4 Pageview tracked: ${location.pathname + location.search}`);
    }
  }, [location]);

  return null;
}


// Component that handles main app functionality including onboarding trigger
function AppContent() {
  useOnboardingTrigger(); // Hook that auto-triggers onboarding for new users
  const { isOpen, title, message, hideSuccessDialog } = useSuccessDialogStore();

  return (
    <SidebarProvider>
      <ThemeEffect />
      <TrackPageViews />
      <AppSidebar />
      <SidebarInset>
        <Routes>
          <Route path="/" element={<AIChatScreen />} />
          <Route path="/entry/:id" element={<Entry />} />
          <Route path="/conversation/:id" element={<AIChatScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/entries" element={<Entries />} />
          <Route path="/privacy-info" element={<PrivacyInfo />} />
          <Route path="/stash" element={<Stash />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SidebarInset>

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={isOpen}
        onClose={hideSuccessDialog}
        title={title}
        message={message}
      />

      {/* Onboarding Modal */}
      <OnboardingModal />
      <Toaster />
    </SidebarProvider>
  );
}

function App() {
  return (
    <Router>
      <AIProvider>
        <AppContent />
      </AIProvider>
    </Router>
  );
}

export default App;
