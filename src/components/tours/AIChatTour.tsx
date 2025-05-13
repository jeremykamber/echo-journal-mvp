import React from 'react';
import FeatureTour from '@/components/onboarding/FeatureTour';
import type { TourStep } from '@/hooks/useFeatureTour';

// Define tour steps for AI Chat page
const chatTourSteps: TourStep[] = [
  {
    targetSelector: '.chat-input-container', // This is a class we'll add to the chat input
    title: 'Chat with Echo',
    description: 'Ask Echo anything about your journal entries or start a new conversation here.',
    position: 'top'
  },
  {
    targetSelector: '[data-sidebar="trigger"]', // Target the sidebar trigger using data attribute
    title: 'Access Your Journal',
    description: 'Open the sidebar to view all your journal entries and past conversations.',
    position: 'right'
  },
  {
    targetSelector: '.new-journal-button', // This is a class we added to the new journal button
    title: 'Create Journal Entry',
    description: 'Click here to start writing a new journal entry and capture your thoughts.',
    position: 'left'
  }
];

const AIChatTour: React.FC = () => {
  return <FeatureTour tourId="ai-chat-tour" steps={chatTourSteps} autoStart={true} />;
};

export default AIChatTour;
