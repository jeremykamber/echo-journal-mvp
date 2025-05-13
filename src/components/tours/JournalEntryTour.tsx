import React from 'react';
import FeatureTour from '@/components/onboarding/FeatureTour';
import type { TourStep } from '@/hooks/useFeatureTour';

// Sample tour steps for the Journal Entry page
const journalEntryTourSteps: TourStep[] = [
    {
        targetSelector: '.entry-editor', // Class that would be on the journal editor
        title: 'Your Journal Space',
        description: 'This is where you can write your thoughts, feelings, and experiences. Everything is stored locally and private.',
        position: 'left'
    },
    {
        targetSelector: '.chat-panel', // Class that would be on the chat panel
        title: 'Chat with Echo',
        description: 'Ask Echo anything about your journal entries, and watch it reflect on your writing in real time.',
        position: 'left'
    },
];

const JournalEntryTour: React.FC = () => (
    <FeatureTour
        tourId="journal-entry-tour"
        steps={journalEntryTourSteps}
        autoStart={true}
    />
);

export default JournalEntryTour;
