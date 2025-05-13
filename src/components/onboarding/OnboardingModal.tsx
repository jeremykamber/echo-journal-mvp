import React from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import OnboardingWelcome from './steps/OnboardingWelcome';
import OnboardingJournal from './steps/OnboardingJournal';
import OnboardingAI from './steps/OnboardingAI';
import OnboardingComplete from './steps/OnboardingComplete';

export const OnboardingModal = () => {
    const {
        isActive,
        currentStep,
        nextStep,
        prevStep,
        skipOnboarding,
        completeOnboarding,
        totalSteps
    } = useOnboardingStore();

    // Render the current step content
    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <OnboardingWelcome />;
            case 1:
                return <OnboardingJournal />;
            case 2:
                return <OnboardingAI />;
            case 3:
                return <OnboardingComplete />;
            default:
                return <OnboardingWelcome />;
        }
    };

    // If onboarding is not active, don't render anything
    if (!isActive) return null;

    const isLastStep = currentStep === totalSteps - 1;

    return (
        <Dialog open={isActive} onOpenChange={skipOnboarding}>
            <DialogContent
                className={
                    cn(
                        "sm:max-w-[500px] flex flex-col border-primary/20 p-0 overflow-hidden",
                        "max-h-[100dvh] h-[90dvh] w-full max-w-full md:max-w-[500px]"
                    )
                }
                style={{
                    maxWidth: '100vw',
                    width: '100%',
                    maxHeight: '100dvh',
                    height: '90dvh',
                    padding: 0,
                    overflow: 'hidden',
                }}
            >
                <div className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto p-6 w-full">
                    {renderStep()}
                </div>

                {/* Progress indicators */}
                <div className="flex justify-center my-2 gap-1">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                i === currentStep
                                    ? "w-6 bg-primary"
                                    : "w-3 bg-muted"
                            )}
                        />
                    ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between border-t border-border p-4 bg-background">
                    <Button
                        variant="ghost"
                        onClick={skipOnboarding}
                        className="text-muted-foreground"
                    >
                        Skip
                    </Button>

                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <Button variant="outline" onClick={prevStep}>
                                Back
                            </Button>
                        )}
                        <Button
                            onClick={isLastStep ? completeOnboarding : nextStep}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isLastStep ? "Get Started" : "Next"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingModal;
