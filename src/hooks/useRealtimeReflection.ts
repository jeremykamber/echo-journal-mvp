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

  // Flow & Signal State
  const lastReflectedLengthRef = useRef(0);
  const lastTypingTimestampRef = useRef(Date.now());
  const lastContentLengthRef = useRef(0);
  const typingSpeedRef = useRef(0); // WPM approximation

  // Track typing speed on content change
  useEffect(() => {
    const now = Date.now();
    const timeDiff = (now - lastTypingTimestampRef.current) / 1000; // seconds
    const contentDiff = Math.abs(content.length - lastContentLengthRef.current);

    if (timeDiff > 2 && contentDiff > 0) {
      // Simple WPM Calc: (Chars / 5) / (Seconds / 60)
      // If > 2 seconds elapsed, update speed
      const wpm = (contentDiff / 5) / (timeDiff / 60);
      typingSpeedRef.current = wpm;
      lastTypingTimestampRef.current = now;
      lastContentLengthRef.current = content.length;
    } else if (contentDiff > 0) {
      // Update timestamp on any activity to keep "Flow" timer fresh
      lastTypingTimestampRef.current = now;
      lastContentLengthRef.current = content.length;
    }
  }, [content]);

  useEffect(() => {
    if (!hasStartedEditing) return;
    const trimmed = debouncedContent.trim();
    if (!entryId || !trimmed) return;

    // --- SIGNAL: Inquisitive Cues ---
    // If the user asks a question, we lower the barrier to entry significantly.
    // We look at the *recent* chunk of text.
    const recentChunk = trimmed.slice(lastReflectedLengthRef.current);
    const hasQuestion = /[?](?:\s|$)/.test(recentChunk) || /\b(I wonder|Why do I|What if)\b/i.test(recentChunk);

    // --- FLOW: Pacing Gatekeeper ---
    // 1. Burst Check: Have they written enough new substance?
    const newChars = trimmed.length - lastReflectedLengthRef.current;

    // We only consider triggering if they've written *something* substantial since start or last reflection.
    // Question = low barrier (20 chars). Narrative = high barrier (150 chars).
    const MIN_BURST_CHARS = hasQuestion ? 20 : 150;

    // Special case: First reflection needs lower barrier
    const isFirstReflection = lastReflectedLengthRef.current === 0;
    const effectiveBurstLimit = isFirstReflection ? Math.min(MIN_BURST_CHARS, reflectionMinLength) : MIN_BURST_CHARS;

    if (newChars < effectiveBurstLimit) {
      // Skipping: Not enough new content to warrant interruption
      return;
    }

    // 2. Velocity Check: Are they currently in a "Flow State"?
    // If WPM is high (> 40), we don't interrupt unless they explicitly asked a question.
    const isFlowing = typingSpeedRef.current > 40;

    if (isFlowing && !hasQuestion) {
      console.log(`[Realtime] Skipping: User in Flow State (approx ${typingSpeedRef.current.toFixed(0)} WPM)`);
      return;
    }

    const endsWithSentence = /[.!?]$/.test(trimmed);
    if (!endsWithSentence && !hasQuestion) return; // Wait for sentence finish unless it's a question burst

    cancelledRef.current = false;

    const addReflection = async () => {
      try {
        setInferenceError(null);
        setIsInferring(true);

        // Check if local mode but provider not ready
        const settings = useSettingsStore.getState();
        if (settings.aiProvider === 'local' && !getGlobalLLMProvider()) {
          setInferenceError(
            'Local AI mode enabled but model not downloaded.'
          );
          setIsInferring(false);
          return;
        }

        const threadMessages = useJournalStore.getState().messages.filter((m) => m.threadId === threadId);
        const lastReflection = [...threadMessages].reverse().find((m) => m.isRealtimeReflection);
        const lastReflectedContent = lastReflection?.reflectedContent || '';

        let reflectionTarget = trimmed;
        // Optimization: Reflect on the whole entry if small, or just the new chunk + context if large
        if (lastReflection || trimmed.length > 1200) {
          const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [];
          // Grab last 3 sentences for context
          const lastSentences = sentences.slice(-3).join('').trim();
          reflectionTarget = lastSentences.length > 80 ? lastSentences : trimmed.slice(-400);
        }

        // --- SIGNAL: Semantic Divergence ---
        if (lastReflection) {
          const sim = await getEmbeddingSimilarity(lastReflectedContent, reflectionTarget);

          // Smart Thresholding
          // Question = lenient (0.95), Narrative = strict (0.85)
          const threshold = hasQuestion ? 0.95 : 0.85;

          if (sim > threshold) {
            console.log(`[Realtime] Skipping: Similarity ${sim.toFixed(2)} > ${threshold} (No Semantic Pivot)`);
            setIsInferring(false);
            return;
          }
          console.log(`[Realtime] Triggering: Signal Detected (Sim: ${sim.toFixed(2)}, Question: ${hasQuestion}, Burst: ${newChars})`);
        }

        let reflectionText = '';
        let addedMessageId: string | null = null;
        try {
          const stream = streamRealtimeReflection(reflectionTarget, entryId);
          for await (const { token } of stream) {
            if (cancelledRef.current) break;
            if (!addedMessageId) {
              addedMessageId = addMessage('ai', '', threadId, entryId, true, reflectionTarget);
              // Update our "Watermark"
              lastReflectedLengthRef.current = trimmed.length;
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
