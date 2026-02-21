import type { UserProfile } from "@/types/shared";
import type { AppSettings } from "@/store/settingsStore";
import type { SupabaseError } from "@/types/shared";

/**
 * Interface for user service
 */
export interface IUserService {
  /**
   * Get user profile
   * @param userId Optional user ID, defaults to current user
   * @returns User profile data
   */
  getUserProfile(
    userId?: string,
  ): Promise<{ profile: UserProfile | null; error: SupabaseError | null }>;

  /**
   * Update user profile
   * @param userId User ID
   * @param profileData Updated profile data
   * @returns Success status or error
   */
  updateUserProfile(
    userId: string,
    profileData: Partial<UserProfile>,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Update last seen timestamp for user
   * @param userId User ID
   */
  updateLastSeen(userId: string): Promise<void>;

  /**
   * Get user settings
   * @returns User settings
   */
  getUserSettings(): Promise<{
    settings: AppSettings | null;
    error: SupabaseError | null;
  }>;

  /**
   * Update user settings
   * @param settings Updated settings
   * @returns Success status or error
   */
  updateUserSettings(
    settings: Partial<AppSettings>,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Mark a tour as completed
   * @param tourId Tour ID
   * @returns Success status or error
   */
  markTourCompleted(
    tourId: string,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;
}