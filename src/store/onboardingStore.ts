import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
  isActive: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  skipOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      currentStep: 0,
      totalSteps: 4,
      isActive: false,

      startOnboarding: () => set({ isActive: true, currentStep: 0 }),
      completeOnboarding: () =>
        set({ hasCompletedOnboarding: true, isActive: false }),
      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
        })),
      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 0),
        })),
      goToStep: (step: number) =>
        set((state) => ({
          currentStep: Math.min(
            Math.max(step, 0),
            state.totalSteps - 1
          ),
        })),
      skipOnboarding: () => set({ hasCompletedOnboarding: true, isActive: false }),
    }),
    { name: 'echo-onboarding-storage' }
  )
);
