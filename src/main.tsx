import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ReactGA from "react-ga4";
import './index.css'
import App from './App'
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ServiceProvider } from '@/providers/ServiceProvider';

// Initialize GA4
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (gaMeasurementId) {
  ReactGA.initialize(gaMeasurementId);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ServiceProvider>
        <App />
      </ServiceProvider>
    </QueryClientProvider>
  </StrictMode>,
)
