import type { AppFeedbackPayload } from '@/clients/supabaseClient';

export type FeedbackService = {
  submitFeedback: (
    emojiRating: string,
    additionalFeedback?: string
  ) => Promise<{ success: boolean; error: Error | null }>;
};

export function makeFeedbackService({
  insertAppFeedback,
}: {
  insertAppFeedback: (payload: AppFeedbackPayload) => Promise<{ success: boolean; error: Error | null }>;
}): FeedbackService {
  return {
    submitFeedback: async (emojiRating, additionalFeedback) => {
      // Validate emoji rating
      const valid = ['😃', '🙂', '😐', '😞'];
      if (!valid.includes(emojiRating)) {
        return { success: false, error: new Error('Invalid emoji rating') };
      }

      // Enrich payload with a session id if available
      try {
        if (!localStorage.getItem('sessionId')) {
          localStorage.setItem('sessionId', `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
        }
        const session_id = localStorage.getItem('sessionId') || undefined;

        const payload: AppFeedbackPayload = {
          emoji_rating: emojiRating,
          additional_feedback: additionalFeedback,
          session_id,
        };

        const res = await insertAppFeedback(payload);
        if (!res.success) return { success: false, error: res.error || new Error('Unknown client error') };

        // Service intentionally does not emit analytics events; analytics
        // should be emitted by the UI layer or a dedicated analytics middleware
        // to avoid duplicate events and keep service logic pure.

        return { success: true, error: null };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
  };
}

export default makeFeedbackService;
