import { useEffect, useRef } from 'react';
import useJournalStore, { JournalState } from '@/store/journalStore';
import { useDebounce } from '@/hooks/useDebounce';
import { streamRealtimeReflection } from '@/services/aiService';
import { getEmbeddingSimilarity } from '@/services/llmService';

interface UseRealtimeReflectionProps {
  entryId?: string;
  threadId: string;
  content: string;
  hasStartedEditing: boolean;
  reflectionSimilarityThreshold: number;
  reflectionMinLength: number;
}

export function useRealtimeReflection({
  entryId,
  threadId,
  content,
  hasStartedEditing,
  reflectionSimilarityThreshold,
  reflectionMinLength,
}: UseRealtimeReflectionProps) {
  const addMessage = useJournalStore((state) => state.addMessage);
  const debouncedContent = useDebounce(content, 2000);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!hasStartedEditing) return;
    const trimmed = debouncedContent.trim();
    const endsWithSentence = /[.!?]$/.test(trimmed);
    if (!entryId || !trimmed || trimmed.length < reflectionMinLength || !endsWithSentence) return;
    cancelledRef.current = false;

    const addReflection = async () => {
      const threadMessages = useJournalStore.getState().messages.filter((m) => m.threadId === threadId);
      const lastReflection = [...threadMessages].reverse().find((m) => m.isRealtimeReflection);

      let reflectionTarget = trimmed;
      if (lastReflection || trimmed.length > 1200) {
        const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [];
        const lastSentences = sentences.slice(-3).join('').trim();
        reflectionTarget = lastSentences.length > 80 ? lastSentences : trimmed.slice(-400);
      }

      if (lastReflection) {
        const lastReflectedContent = lastReflection.reflectedContent || '';
        const sim = await getEmbeddingSimilarity(lastReflectedContent, reflectionTarget);
        if (sim > reflectionSimilarityThreshold || reflectionTarget.length < reflectionMinLength) return;
      }

      let reflectionText = '';
      let addedMessageId: string | null = null;
      try {
        const stream = streamRealtimeReflection(reflectionTarget, entryId);
        for await (const { token } of stream) {
          if (cancelledRef.current) break;
          if (!addedMessageId) {
            addedMessageId = addMessage('ai', '', threadId, entryId, true, reflectionTarget);
          }
          reflectionText += token;
          useJournalStore.getState().updateMessageById(addedMessageId, reflectionText);
        }
      } catch (err) {
        console.error('Error streaming realtime reflection:', err);
      }
      if (!cancelledRef.current && reflectionText.trim() && addedMessageId) {
        useJournalStore.getState().updateMessageById(addedMessageId, reflectionText);
      }
    };

    addReflection();
    return () => {
      cancelledRef.current = true;
    };
  }, [
    debouncedContent,
    entryId,
    threadId,
    addMessage,
    hasStartedEditing,
    reflectionSimilarityThreshold,
    reflectionMinLength,
  ]);
}
