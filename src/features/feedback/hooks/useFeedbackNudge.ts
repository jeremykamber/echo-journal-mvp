import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useServices } from '@/providers/ServiceProvider';
import type { FeedbackService } from '@/features/feedback/services/feedbackService';

export function useFeedbackNudge({ service }: { service?: FeedbackService } = {}) {
  const services = useServices();
  const feedbackService: FeedbackService = service ?? services.feedbackService;

  const mutation = useMutation<
    { success: boolean; error: Error | null },
    Error,
    { emoji: string; additionalFeedback?: string }
  >({
    mutationFn: (vars: { emoji: string; additionalFeedback?: string }) =>
      feedbackService.submitFeedback(vars.emoji, vars.additionalFeedback),
  });

  const submitFeedback = useCallback(
    async (emoji: string, additionalFeedback?: string) => {
      try {
        const result = await mutation.mutateAsync({ emoji, additionalFeedback });
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        return { success: false, error: e };
      }
    },
    [mutation]
  );

  const submitEmoji = useCallback(
    async (emoji: string) => {
      if (emoji === '😞') return { needsFollowUp: true } as const;
      const res = await submitFeedback(emoji);
      return { needsFollowUp: false, result: res } as const;
    },
    [submitFeedback]
  );

  // Cast mutation to any when reading convenience boolean props to avoid
  // fragile type mismatches between installed react-query typings and our
  // local TypeScript config. These are simple derived values used by UI.
  return {
    submitEmoji,
    submitFeedback,
    isLoading: (mutation as any).isLoading as boolean,
    isError: (mutation as any).isError as boolean,
    error: mutation.error as Error | null,
    isSuccess: (mutation as any).isSuccess as boolean,
  } as const;
}

export default useFeedbackNudge;
