// src/context/AIContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import useJournalStore from '@/store/journalStore';
import useConversationStore from '@/store/conversationStore';
import { streamReflectionToStore } from '@/services/aiService';
import { useNavigate } from 'react-router-dom';
import { trackSendMessage, trackStartReflection } from '@/services/analyticsService';
import { useLLMProvider } from '@/services/llmProviders/useLLMProvider';

interface AIContextValue {
  sendMessageToAI: (
    input: string,
    threadId: string,
    options?: {
      entryId?: string;
      targetType?: 'journal' | 'conversation';
      isDeepReflection?: boolean;
    },
    navigateTo?: string
  ) => Promise<void>;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

export const AIProvider = ({ children }: { children: ReactNode }) => {
  const journalStore = useJournalStore();
  const conversationStore = useConversationStore();
  const addJournalMessage = journalStore.addMessage;
  const addConversationMessage = conversationStore.addMessage;
  const navigate = useNavigate();

  useLLMProvider();


  const sendMessageToAI: AIContextValue['sendMessageToAI'] = async (
    input,
    threadId,
    options = {},
    navigateTo
  ) => {
    const { entryId, targetType = 'journal', isDeepReflection = false } = options;

    if (!input.trim()) {
      console.warn('Attempted to send empty message');
      return;
    }

    trackSendMessage();
    trackStartReflection(targetType === 'conversation' ? 'Conversation' : 'Journal');

    if (navigateTo) {
      navigate(navigateTo);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (targetType === 'conversation') {
      addConversationMessage('user', input, threadId);
    } else {
      addJournalMessage('user', input, threadId, entryId);
    }

    // Always use aiService which handles RAG, system prompts, and works with any provider
    await streamReflectionToStore({
      question: input,
      targetType,
      targetId: threadId,
      entryId,
      isDeepReflection,
    });
  };

  return <AIContext.Provider value={{ sendMessageToAI }}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAI must be used inside an AIProvider');
  return ctx;
};
