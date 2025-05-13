import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSettingsStore } from '@/store/settingsStore';

// A hook to check if we should show a feature spotlight tour
// after the user has completed the initial onboarding
export function usePostOnboardingTour(tourId: string, delayMs: number = 2000) {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const { hasCompletedOnboarding } = useOnboardingStore();

  // Memoize selectors to avoid getSnapshot warnings
  const completedTours = useSettingsStore(state => state.completedTours || []);
  const markTourCompleted = useSettingsStore(state => state.markTourCompleted);

  useEffect(() => {
    // Only show a tour if:
    // 1. User has completed onboarding
    // 2. User hasn't seen this specific tour before
    if (hasCompletedOnboarding && !completedTours.includes(tourId)) {
      const timer = setTimeout(() => {
        setShouldShowTour(true);
      }, delayMs);

      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, completedTours, tourId, delayMs]);

  const completeTour = () => {
    markTourCompleted(tourId);
    setShouldShowTour(false);
  };

  return { shouldShowTour, completeTour };
}

export default usePostOnboardingTour;
