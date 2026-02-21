import type { UserProfile } from "@/services/supabaseService";
import type { AppSettings } from "@/store/settingsStore";
import type { IAuthService } from "../auth/IAuthService";
import type { IUserService } from "./IUserService";
import { SupabaseError } from "@/services/supabaseService";
import { supabase } from "@/clients/supabaseClient";

/**
 * User service implementing IUserService interface
 * Handles user profile and settings management
 */
export class UserService implements IUserService {
  constructor(private authService: IAuthService) {}

  /**
   * Get user profile
   * @param userId Optional user ID, defaults to current user
   * @returns User profile data
   */
  async getUserProfile(
    userId?: string,
  ): Promise<{ profile: UserProfile | null; error: SupabaseError | null }> {
    try {
      // If no userId provided, get the current user
      if (!userId) {
        const { user } = await this.authService.getCurrentUser();
        userId = user?.id;
      }

      // If still no userId, return null
      if (!userId) {
        return {
          profile: null,
          error: new SupabaseError(
            "No user ID provided and no current user",
          ),
        };
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw new SupabaseError("Failed to get user profile", error);
      if (!data) throw new SupabaseError("User profile not found");

      return { profile: data as UserProfile, error: null };
    } catch (error) {
      console.error("Exception getting user profile:", error);
      return {
        profile: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to get user profile",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Update user profile
   * @param userId User ID
   * @param profileData Updated profile data
   * @returns Success status or error
   */
  async updateUserProfile(
    userId: string,
    profileData: Partial<UserProfile>,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Don't allow updating id, created_at, or email (requires special auth flow)
      const safeUpdate = { ...profileData };
      delete safeUpdate.id;
      delete safeUpdate.created_at;
      delete safeUpdate.email;

      const { error } = await supabase
        .from("users")
        .update(safeUpdate)
        .eq("id", userId);

      if (error) throw new SupabaseError("Failed to update profile", error);

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception updating user profile:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to update profile",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Update last seen timestamp for user
   * @param userId User ID
   */
  async updateLastSeen(userId: string): Promise<void> {
    try {
      await supabase
        .from("users")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (error) {
      console.error("Failed to update last_seen_at:", error);
      // Non-critical error, so we just log it and continue
    }
  }

  /**
   * Get user settings
   * @returns User settings
   */
  async getUserSettings(): Promise<{
    settings: AppSettings | null;
    error: SupabaseError | null;
  }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get settings
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error)
        throw new SupabaseError("Failed to fetch user settings", error);
      if (!data) {
        // Create default settings if not found
        const defaultSettings: AppSettings = {
          reflectionSimilarityThreshold: 0.9,
          reflectionMinLength: 30,
          theme: "system",
          showReflectionLabels: true,
          autoReflect: true,
          enableMemories: true,
          showNudges: true,
          enableWhisper: false,
          enableSharing: false,
          completedTours: [],
          aiProvider: "cloud",
          localModelId: "Qwen2-1.5B-Instruct-q4f32_1-MLC",
          enableEncryption: false,
          storageProvider: "supabase",
        };

        await supabase
          .from("user_settings")
          .insert([{ user_id: user.id, ...defaultSettings }]);

        return { settings: defaultSettings, error: null };
      }

      // Map to app's AppSettings format
      const settings: AppSettings = {
        reflectionSimilarityThreshold: data.reflection_similarity_threshold,
        reflectionMinLength: data.reflection_min_length,
        theme: data.theme as "system" | "light" | "dark",
        showReflectionLabels: data.show_reflection_labels,
        autoReflect: data.auto_reflect,
        enableMemories: data.enable_memories ?? true,
        showNudges: data.show_nudges ?? true,
        enableWhisper: data.enable_whisper ?? false,
        enableSharing: data.enable_sharing ?? false,
        completedTours: data.completed_tours || [],
        aiProvider: data.ai_provider ?? "cloud",
        localModelId:
          data.local_model_id ?? "Qwen2-1.5B-Instruct-q4f32_1-MLC",
        enableEncryption: data.enable_encryption ?? false,
        storageProvider: data.storage_provider ?? "supabase",
      };

      return { settings, error: null };
    } catch (error) {
      console.error("Exception getting user settings:", error);
      return {
        settings: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to get user settings",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Update user settings
   * @param settings Updated settings
   * @returns Success status or error
   */
  async updateUserSettings(
    settings: Partial<AppSettings>,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Map to DB format
      const dbSettings: Record<string, any> = {};
      if (settings.reflectionSimilarityThreshold !== undefined) {
        dbSettings.reflection_similarity_threshold =
          settings.reflectionSimilarityThreshold;
      }
      if (settings.reflectionMinLength !== undefined) {
        dbSettings.reflection_min_length = settings.reflectionMinLength;
      }
      if (settings.theme !== undefined) {
        dbSettings.theme = settings.theme;
      }
      if (settings.showReflectionLabels !== undefined) {
        dbSettings.show_reflection_labels = settings.showReflectionLabels;
      }
      if (settings.autoReflect !== undefined) {
        dbSettings.auto_reflect = settings.autoReflect;
      }
      if (settings.completedTours !== undefined) {
        dbSettings.completed_tours = settings.completedTours;
      }

      // Update settings
      const { error } = await supabase
        .from("user_settings")
        .update(dbSettings)
        .eq("user_id", user.id);

      if (error)
        throw new SupabaseError("Failed to update user settings", error);

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception updating user settings:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to update user settings",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Mark a tour as completed
   * @param tourId Tour ID
   * @returns Success status or error
   */
  async markTourCompleted(
    tourId: string,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get current completed tours
      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("completed_tours")
        .eq("user_id", user.id)
        .single();

      if (fetchError)
        throw new SupabaseError(
          "Failed to fetch user settings",
          fetchError,
        );

      // Add this tour if not already included
      const completedTours = data?.completed_tours || [];
      if (!completedTours.includes(tourId)) {
        completedTours.push(tourId);

        const { error } = await supabase
          .from("user_settings")
          .update({ completed_tours: completedTours })
          .eq("user_id", user.id);

        if (error)
          throw new SupabaseError(
            "Failed to update user settings",
            error,
          );
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception marking tour as completed:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to mark tour as completed",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }
}