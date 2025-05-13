import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboardingStore } from '@/store/onboardingStore';

export function useOnboardingTrigger() {
  const { hasCompletedOnboarding, isActive, startOnboarding } = useOnboardingStore();
  const location = useLocation();

  // Check if we should start onboarding when the app first loads
  useEffect(() => {
    if (!hasCompletedOnboarding && location.pathname === '/' && !isActive) {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        startOnboarding();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, location.pathname, isActive, startOnboarding]);
}
