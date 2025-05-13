import React from 'react';
import FeatureTour from '@/components/onboarding/FeatureTour';
import type { TourStep } from '@/hooks/useFeatureTour';

// Sample tour steps for the Journal Entry page
const journalEntryTourSteps: TourStep[] = [
    {
        targetSelector: '.entry-editor', // Class that would be on the journal editor
        title: 'Your Journal Space',
        description: 'This is where you can write your thoughts, feelings, and experiences. Everything is stored locally and private.',
        position: 'bottom'
    },
    {
        targetSelector: '.ai-reflection-button', // Class that would be on the AI reflection button
        title: 'Get AI Reflections',
        description: 'When you\'re ready, click here to get thoughtful reflections on your journal entry from Echo.',
        position: 'top'
    },
    {
        targetSelector: '.save-button', // Class that would be on the save button
        title: 'Save Your Entry',
        description: 'Your entry is automatically saved, but you can explicitly save it by clicking here.',
        position: 'left'
    }
];

const JournalEntryTour: React.FC = () => (
    <FeatureTour
        tourId="journal-entry-tour"
        steps={journalEntryTourSteps}
        autoStart={true}
    />
);

export default JournalEntryTour;
