import type { User } from "@supabase/supabase-js";
import { supabase } from "@/clients/supabaseClient";
import type { IAuthService } from "./IAuthService";
import { SupabaseError } from "@/types/shared";

/**
 * Authentication service implementing IAuthService interface
 * Handles all authentication operations with Supabase
 */
export class AuthService implements IAuthService {
  /**
   * Register a new user with email and password
   * @param email User's email address
   * @param password User's password
   * @param name User's name
   * @param isBetaUser Whether this user is a beta tester
   * @returns The newly created user
   */
  async registerUser(
    email: string,
    password: string,
    name: string,
    isBetaUser: boolean = false,
  ): Promise<{ user: User | null; error: SupabaseError | null }> {
    try {
      // Register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            is_beta_user: isBetaUser,
          },
        },
      });

      if (authError)
        throw new SupabaseError("Registration failed", authError);
      if (!authData.user)
        throw new SupabaseError(
          "Registration succeeded but no user returned",
        );

      // Create a profile record in the users table
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: authData.user.id,
          email,
          name,
          is_beta_user: isBetaUser,
        },
      ]);

      if (profileError) {
        console.error("Error creating user profile:", profileError);
        // We'll continue anyway since the auth user was created
      }

      // Initialize user settings
      const { error: settingsError } = await supabase
        .from("user_settings")
        .insert([{ user_id: authData.user.id }]);

      if (settingsError) {
        console.error("Error creating user settings:", settingsError);
        // Continue anyway
      }

      return { user: authData.user, error: null };
    } catch (error) {
      console.error("Exception during user registration:", error);
      return {
        user: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Registration failed",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Login with email and password
   * @param email User's email
   * @param password User's password
   * @returns The authenticated user or error
   */
  async loginWithEmail(
    email: string,
    password: string,
  ): Promise<{ user: User | null; error: SupabaseError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new SupabaseError("Login failed", error);
      if (!data.user)
        throw new SupabaseError("Login succeeded but no user returned");

      // Update last seen time
      await this.updateLastSeen(data.user.id);

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Exception during login:", error);
      return {
        user: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Login failed",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Login with Google OAuth
   * @returns Redirect to Google OAuth login
   */
  async loginWithGoogle(): Promise<void> {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  /**
   * Log out the current user
   * @returns Success status or error
   */
  async logout(): Promise<{
    success: boolean;
    error: SupabaseError | null;
  }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new SupabaseError("Logout failed", error);

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception during logout:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Logout failed",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Get the current authenticated user
   * @returns Current user or null
   */
  async getCurrentUser(): Promise<{
    user: User | null;
    error: SupabaseError | null;
  }> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) throw new SupabaseError("Failed to get current user", error);

      // If we have a user, update their last seen time
      if (data.user) {
        await this.updateLastSeen(data.user.id);
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Exception getting current user:", error);
      return {
        user: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to get current user",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Update the user's last seen timestamp
   * @param userId User's ID
   */
  private async updateLastSeen(userId: string): Promise<void> {
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
}