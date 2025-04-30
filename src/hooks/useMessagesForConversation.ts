import useConversationStore, { Message } from '@/store/conversationStore';
import React from 'react';
import { useShallow } from "zustand/shallow"; // Changed from shallow

export function useMessagesForConversation(conversationId: string | null): Message[] {
  // Subscribe to conversation messages for a given conversation ID with shallow comparison
  return useConversationStore(
    (state) => {
      if (!conversationId) return [];
      return state.messages.filter((m) => m.conversationId === conversationId);
    },
    useShallow // Pass useShallow as a reference, not invoked
  );
}
