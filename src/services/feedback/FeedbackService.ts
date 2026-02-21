import type {
  StashItem,
  StashSourceType,
} from "@/services/storage/types";
import type { IAuthService } from "../auth/IAuthService";
import type { IFeedbackService } from "./IFeedbackService";
import { supabase } from "@/clients/supabaseClient";
import { useSettingsStore } from "@/store/settingsStore";
import {
  encryptText,
  decryptText,
  isEncrypted,
} from "@/services/encryptionService";

interface StashRow {
  id: string;
  user_id: string;
  reflection_text: string;
  source_type: StashSourceType;
  source_id: string;
  source_title_or_date: string;
  created_at: string;
  stashed_at: string;
}

/**
 * Feedback service implementing IFeedbackService interface
 * Handles feedback submission, stashing, and app feedback
 */
export class FeedbackService implements IFeedbackService {
  constructor(private authService: IAuthService) {}

  /**
   * Submit feedback for a reflection
   * @param reflectionText Reflection text
   * @param feedbackType Like or dislike
   * @param reflectionType Type of reflection
   * @returns Success status or error
   */
  async submitReflectionFeedback(
    reflectionText: string,
    feedbackType: "like" | "dislike",
    reflectionType: "chat-response" | "realtime-reflection",
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Don't submit if environment variables aren't set up
      if (!this.getSupabaseUrl() || !this.getSupabaseAnonKey()) {
        console.warn(
          "Supabase environment variables not configured, feedback submission skipped",
        );
        // Return success anyway to avoid confusing users when developers haven't set up Supabase
        return { success: true, error: null };
      }

      // Limit the reflectionText length to avoid huge payloads
      // Truncate to 1000 chars if needed, keeping it reasonable for database storage
      const truncatedText =
        reflectionText.length > 1000
          ? reflectionText.substring(0, 997) + "..."
          : reflectionText; // TODO: consider using a more sophisticated truncation method if needed––WATCH OUT FOR THIS

      // Get the current user ID if available
      const { user } = await this.authService.getCurrentUser();

      // Create a feedback record with the required fields
      const feedbackRecord = {
        reflection_text: truncatedText,
        feedback_type: feedbackType,
        reflection_type: reflectionType,
        user_id: user?.id, // May be undefined for anonymous users
      };

      // Insert the record into the reflections_feedback table
      const { error } = await supabase
        .from("reflections_feedback")
        .insert([feedbackRecord]);

      if (error) {
        console.error("Error submitting reflection feedback:", error);
        return {
          success: false,
          error: new Error(`Supabase error: ${error.message}`),
        };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception when submitting reflection feedback:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Unknown error occurred"),
      };
    }
  }

  /**
   * Submit app feedback
   * @param emojiRating Emoji rating
   * @param additionalFeedback Optional additional feedback
   * @returns Success status or error
   */
  async submitAppFeedback(
    emojiRating: string,
    additionalFeedback?: string,
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Keep the same local-dev guard behavior as before
      if (!this.getSupabaseUrl() || !this.getSupabaseAnonKey()) {
        console.warn(
          "Supabase environment variables not configured, feedback submission skipped",
        );
        return { success: true, error: null };
      }

      // Enrich with session id
      const sessionId = await this.getSessionId();

      // Attempt insert via the clients layer
      const res = await this.insertAppFeedback({
        emoji_rating: emojiRating,
        additional_feedback: additionalFeedback,
        session_id: sessionId,
      });

      if (!res.success)
        return {
          success: false,
          error: res.error || new Error("Unknown client error"),
        };
      return { success: true, error: null };
    } catch (error) {
      console.error("Exception when submitting app feedback:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Unknown error occurred"),
      };
    }
  }

  /**
   * Stash a reflection
   * @param params Stash parameters
   * @returns Success status or error
   */
  async stashReflection(params: {
    reflectionText: string;
    sourceType: StashSourceType;
    sourceId: string;
    sourceTitleOrDate: string;
    createdAt: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return { success: false, error: new Error("Not authenticated") };
      const { error } = await supabase.from("stash").insert([
        {
          user_id: user.id,
          reflection_text: this.shouldEncrypt()
            ? await encryptText(params.reflectionText, user.id)
            : params.reflectionText,
          source_type: params.sourceType,
          source_id: params.sourceId,
          source_title_or_date: params.sourceTitleOrDate,
          created_at: params.createdAt,
          stashed_at: new Date().toISOString(),
        },
      ]);
      if (error) return { success: false, error };
      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * Get all stashed reflections
   * @returns Array of stash items
   */
  async getStash(): Promise<{
    items: StashItem[];
    error: Error | null;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { items: [], error: new Error("Not authenticated") };
      const { data, error } = await supabase
        .from("stash")
        .select("*")
        .eq("user_id", user.id)
        .order("stashed_at", { ascending: false });
      if (error) return { items: [], error };
      // Map DB fields to StashItem
      const items: StashItem[] = await Promise.all(
        (data || []).map(async (row: StashRow) => ({
          stashItemId: row.id,
          userId: row.user_id,
          reflectionText: isEncrypted(row.reflection_text)
            ? await decryptText(row.reflection_text, row.user_id).catch(
              () => row.reflection_text,
            )
            : row.reflection_text,
          sourceType: row.source_type,
          sourceId: row.source_id,
          sourceTitleOrDate: row.source_title_or_date,
          createdAt: row.created_at,
          stashedAt: row.stashed_at,
        })),
      );
      return { items, error: null };
    } catch (error) {
      return {
        items: [],
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * Remove a stashed reflection
   * @param stashItemId Stash item ID
   * @returns Success status or error
   */
  async unstashReflection(
    stashItemId: string,
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return { success: false, error: new Error("Not authenticated") };
      const { error } = await supabase
        .from("stash")
        .delete()
        .eq("id", stashItemId)
        .eq("user_id", user.id);
      if (error) return { success: false, error };
      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * Get count of stashed reflections
   * @returns Count and error
   */
  async getStashCount(): Promise<{
    count: number;
    error: Error | null;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { count: 0, error: new Error("Not authenticated") };
      const { count, error } = await supabase
        .from("stash")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) return { count: 0, error };
      return { count: count || 0, error: null };
    } catch (error) {
      return {
        count: 0,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * Helper to check encryption capability
   */
  private shouldEncrypt(): boolean {
    return useSettingsStore.getState().enableEncryption;
  }

  /**
   * Get Supabase URL from env
   */
  private getSupabaseUrl(): string | undefined {
    return import.meta.env.VITE_SUPABASE_URL;
  }

  /**
   * Get Supabase anon key from env
   */
  private getSupabaseAnonKey(): string | undefined {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  /**
   * Get session ID for feedback tracking
   */
  private async getSessionId(): Promise<string> {
    // Use localStorage to persist session ID across browser sessions
    const SESSION_KEY = 'echo-journal-session-id';
    
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      // Generate a new session ID using timestamp and random string
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    
    return sessionId;
  }

  /**
   * Insert app feedback (placeholder - needs implementation)
   */
  private async insertAppFeedback(data: {
    emoji_rating: string;
    additional_feedback?: string;
    session_id: string;
  }): Promise<{ success: boolean; error: Error | null }> {
    // This should be implemented to actually insert into Supabase
    // For now, return success
    try {
      const { error } = await supabase.from("app_feedback").insert([data]);
      if (error) return { success: false, error };
      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }
}