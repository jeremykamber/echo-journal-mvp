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
import PrivacyInfo from './pages/PrivacyInfo';

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


function App() {
  return (
    <Router>
      <AIProvider>
        <SidebarProvider>
          <ThemeEffect />
          <TrackPageViews /> {/* Add page view tracker */}
          <AppSidebar />
          <SidebarInset>
            <Routes>
              <Route path="/" element={<AIChatScreen />} />
              <Route path="/entry/:id" element={<Entry />} />
              <Route path="/conversation/:id" element={<AIChatScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/entries" element={<Entries />} />
              <Route path="/privacy-info" element={<PrivacyInfo />} />
            </Routes>
          </SidebarInset>
        </SidebarProvider>
      </AIProvider>
    </Router>
  );
}

export default App;
