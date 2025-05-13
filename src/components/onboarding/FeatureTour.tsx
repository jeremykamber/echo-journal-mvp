import React, { useEffect } from 'react';
import useFeatureTour, { TourStep } from '@/hooks/useFeatureTour';
import { useSettingsStore } from '@/store/settingsStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import FeatureSpotlight from './FeatureSpotlight';

interface FeatureTourProps {
  tourId: string;
  steps: TourStep[];
  autoStart?: boolean;
}

const FeatureTour: React.FC<FeatureTourProps> = ({ tourId, steps, autoStart = false }) => {
  // Access tour state and navigation
  const { currentStep, isActive, startTour, endTour, nextStep } = useFeatureTour(steps);
  // Persisted state for completed tours and onboarding
  const completedTours = useSettingsStore(state => state.completedTours || []);
  const markTourCompleted = useSettingsStore(state => state.markTourCompleted);
  const hasCompletedOnboarding = useOnboardingStore(state => state.hasCompletedOnboarding);

  // Auto-start tour when post-onboarding
  useEffect(() => {
    if (
      autoStart &&
      hasCompletedOnboarding &&
      !completedTours.includes(tourId) &&
      !isActive
    ) {
      const timer = setTimeout(startTour, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompletedOnboarding, completedTours, tourId, isActive, startTour]);

  // Nothing to render if inactive
  if (!currentStep || !isActive) {
    return null;
  }

  // Determine last step for closing
  const isLastStep = currentStep.isLastStep || false;
  const handleClose = () => {
    markTourCompleted(tourId);
    endTour();
  };

  return (
    <FeatureSpotlight
      targetSelector={currentStep.targetSelector}
      isActive={isActive}
      title={currentStep.title}
      description={currentStep.description}
      position={currentStep.position}
      onClose={isLastStep ? handleClose : nextStep}
    />
  );
};

export default FeatureTour;
