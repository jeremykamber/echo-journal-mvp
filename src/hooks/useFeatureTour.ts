import { useState } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  isLastStep?: boolean; // Flag to indicate this is the last step
}

export const useFeatureTour = (steps: TourStep[]) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const { hasCompletedOnboarding } = useOnboardingStore();

  const startTour = () => {
    // Only show tours if user has completed the initial onboarding
    if (hasCompletedOnboarding && steps.length > 0) {
      setCurrentStepIndex(0);
    }
  };

  const endTour = () => {
    setCurrentStepIndex(-1);
  };

  const nextStep = () => {
    if (currentStepIndex >= steps.length - 1) {
      endTour();
    } else {
      setCurrentStepIndex(prevIndex => prevIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex <= 0) {
      endTour();
    } else {
      setCurrentStepIndex(prevIndex => prevIndex - 1);
    }
  };

  const goToStep = (index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    } else {
      endTour();
    }
  };

  // Create the current step object with an isLastStep flag
  const currentStep = currentStepIndex >= 0 ? {
    ...steps[currentStepIndex],
    isLastStep: currentStepIndex === steps.length - 1
  } : null;
  const isActive = currentStepIndex >= 0;

  return {
    currentStep,
    isActive,
    startTour,
    endTour,
    nextStep,
    prevStep,
    goToStep,
    currentStepIndex,
    totalSteps: steps.length
  };
};

export default useFeatureTour;
