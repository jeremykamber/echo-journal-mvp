import { useEffect } from 'react';
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

function App() {
  return (
    <Router>
      <AIProvider>
        <SidebarProvider>
          <ThemeEffect />
          <AppSidebar />
          <SidebarInset>
            <Routes>
              <Route path="/" element={<AIChatScreen />} />
              <Route path="/entry/:id" element={<Entry />} />
              <Route path="/conversation/:id" element={<AIChatScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/entries" element={<Entries/>} />
            </Routes>
          </SidebarInset>
        </SidebarProvider>
      </AIProvider>
    </Router>
  );
}

export default App;
