import { useEffect, useRef, useState } from 'react';
import useJournalStore from '@/store/journalStore';
import { useDebounce } from '@/hooks/useDebounce';
import { streamRealtimeReflection } from '@/services/aiService';
import { getEmbeddingSimilarity } from '@/services/llmService';
import { useSettingsStore } from '@/store/settingsStore';
import { getGlobalLLMProvider } from '@/services/llmProviders/adapterService';

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
  const [isInferring, setIsInferring] = useState(false);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasStartedEditing) return;
    const trimmed = debouncedContent.trim();
    const endsWithSentence = /[.!?]$/.test(trimmed);
    if (!entryId || !trimmed || trimmed.length < reflectionMinLength || !endsWithSentence) return;
    cancelledRef.current = false;

    const addReflection = async () => {
      try {
        setInferenceError(null);
        setIsInferring(true);

        // Check if local mode but provider not ready
        const settings = useSettingsStore.getState();
        if (settings.aiProvider === 'local' && !getGlobalLLMProvider()) {
          setInferenceError(
            'Local AI mode enabled but model not downloaded. Please download the model in Settings or switch to Cloud mode.'
          );
          setIsInferring(false);
          return;
        }

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
          if (sim > reflectionSimilarityThreshold || reflectionTarget.length < reflectionMinLength) {
            setIsInferring(false);
            return;
          }
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
          setInferenceError(err instanceof Error ? err.message : 'Failed to generate reflection');
        }

        if (!cancelledRef.current && reflectionText.trim() && addedMessageId) {
          useJournalStore.getState().updateMessageById(addedMessageId, reflectionText);
        }

        setIsInferring(false);
      } catch (err) {
        setInferenceError(err instanceof Error ? err.message : 'Unknown error');
        setIsInferring(false);
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

  return {
    isInferring,
    inferenceError,
  };
}
