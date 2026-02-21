import type {
  StashItem,
  StashSourceType,
} from "@/services/supabaseService";

/**
 * Interface for feedback service
 */
export interface IFeedbackService {
  /**
   * Submit feedback for a reflection
   * @param reflectionText Reflection text
   * @param feedbackType Like or dislike
   * @param reflectionType Type of reflection
   * @returns Success status or error
   */
  submitReflectionFeedback(
    reflectionText: string,
    feedbackType: "like" | "dislike",
    reflectionType: "chat-response" | "realtime-reflection",
  ): Promise<{ success: boolean; error: Error | null }>;

  /**
   * Submit app feedback
   * @param emojiRating Emoji rating
   * @param additionalFeedback Optional additional feedback
   * @returns Success status or error
   */
  submitAppFeedback(
    emojiRating: string,
    additionalFeedback?: string,
  ): Promise<{ success: boolean; error: Error | null }>;

  /**
   * Stash a reflection
   * @param params Stash parameters
   * @returns Success status or error
   */
  stashReflection(params: {
    reflectionText: string;
    sourceType: StashSourceType;
    sourceId: string;
    sourceTitleOrDate: string;
    createdAt: string;
  }): Promise<{ success: boolean; error: Error | null }>;

  /**
   * Get all stashed reflections
   * @returns Array of stash items
   */
  getStash(): Promise<{
    items: StashItem[];
    error: Error | null;
  }>;

  /**
   * Remove a stashed reflection
   * @param stashItemId Stash item ID
   * @returns Success status or error
   */
  unstashReflection(
    stashItemId: string,
  ): Promise<{ success: boolean; error: Error | null }>;

  /**
   * Get count of stashed reflections
   * @returns Count and error
   */
  getStashCount(): Promise<{
    count: number;
    error: Error | null;
  }>;
}