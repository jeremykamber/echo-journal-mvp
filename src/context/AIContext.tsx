// src/context/AIContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import useJournalStore from '@/store/journalStore';
import useConversationStore from '@/store/conversationStore';
import { streamReflectionToStore } from '@/services/aiService';
import { useNavigate } from 'react-router-dom'; // Import the useNavigate hook
import { trackSendMessage, trackStartReflection } from '@/services/analyticsService';

interface AIContextValue {
  sendMessageToAI: (
    input: string,
    threadId: string,
    options?: {
      entryId?: string;
      targetType?: 'journal' | 'conversation';
    },
    navigateTo?: string // Add navigateTo parameter
  ) => Promise<void>;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

export const AIProvider = ({ children }: { children: ReactNode }) => {
  const addJournalMessage = useJournalStore((state) => state.addMessage);
  const addConversationMessage = useConversationStore((state) => state.addMessage);
  const navigate = useNavigate(); // Initialize navigate here

  const sendMessageToAI: AIContextValue['sendMessageToAI'] = async (
    input,
    threadId,
    options = {},
    navigateTo // Accept navigateTo parameter
  ) => {
    const { entryId, targetType = 'journal' } = options;

    console.log('sendMessageToAI called with:', { input, threadId, options, navigateTo });

    if (!input.trim()) {
      console.warn('Attempted to send empty message');
      return;
    }

    // Track the event before sending
    trackSendMessage();

    // Track the start of reflection
    trackStartReflection(targetType === 'conversation' ? 'Conversation' : 'Journal');

    // Optional: Perform the navigation before streaming to ensure DOM updates
    if (navigateTo) {
      console.log('Navigating to:', navigateTo);
      navigate(navigateTo); // Navigate to the new route
      await new Promise((resolve) => setTimeout(resolve, 50)); // Short debounce
      console.log('Navigation completed.');
    }

    // Add user message to store based on targetType
    if (targetType === 'conversation') {
      console.log('Adding user message to conversation:', { input, threadId });
      addConversationMessage('user', input, threadId);
    } else {
      console.log('Adding user message to journal:', { input, threadId, entryId });
      addJournalMessage('user', input, threadId, entryId);
    }

    // Start streaming the AI response
    console.log('Starting AI response streaming with:', { question: input, targetType, threadId, entryId });
    // Delegate streaming and state updates to AI service
    await streamReflectionToStore({
      question: input,
      targetType,
      targetId: threadId,
      entryId,
    });
    console.log('AI response streaming completed.');
  };

  return <AIContext.Provider value={{ sendMessageToAI }}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAI must be used inside an AIProvider');
  return ctx;
};
