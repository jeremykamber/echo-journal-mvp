import type { User } from "@supabase/supabase-js";
import type { SupabaseError } from "@/types/shared";

/**
 * Interface for authentication service
 */
export interface IAuthService {
  /**
   * Register a new user
   * @param email User's email
   * @param password User's password
   * @param name User's name
   * @param isBetaUser Whether user is a beta tester
   * @returns Created user or error
   */
  registerUser(
    email: string,
    password: string,
    name: string,
    isBetaUser?: boolean,
  ): Promise<{ user: User | null; error: SupabaseError | null }>;

  /**
   * Login with email and password
   * @param email User's email
   * @param password User's password
   * @returns Authenticated user or error
   */
  loginWithEmail(
    email: string,
    password: string,
  ): Promise<{ user: User | null; error: SupabaseError | null }>;

  /**
   * Login with Google OAuth
   * @returns Initiates OAuth flow
   */
  loginWithGoogle(): Promise<void>;

  /**
   * Logout current user
   * @returns Success status or error
   */
  logout(): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Get current authenticated user
   * @returns Current user or error
   */
  getCurrentUser(): Promise<{
    user: User | null;
    error: SupabaseError | null;
  }>;

  /**
   * Update current user's password
   * @param password New password
   * @returns Success status or error
   */
  updatePassword(password: string): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Send password reset email
   * @param email User's email
   * @param redirectTo URL to redirect to after password reset
   * @returns Success status or error
   */
  resetPasswordForEmail(email: string, redirectTo?: string): Promise<{ success: boolean; error: SupabaseError | null }>;
}