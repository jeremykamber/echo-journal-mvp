import type { JournalEntry } from "@/store/journalStore";
import type { IJournalService } from "./IJournalService";
import type { IAuthService } from "../auth/IAuthService";
import { SupabaseError } from "@/types/shared";
import { supabase } from "@/clients/supabaseClient";
import { useSettingsStore } from "@/store/settingsStore";
import {
  encryptText,
  decryptText,
  isEncrypted,
} from "@/services/encryptionService";

/**
 * Journal service implementing IJournalService interface
 * Handles all journal entry CRUD operations with encryption support
 */
export class JournalService implements IJournalService {
  constructor(private authService: IAuthService) {}

  /**
   * Create a journal entry
   * @param entry Journal entry data
   * @returns Created entry or error
   */
  async createJournalEntry(
    entry: Omit<JournalEntry, "id"> & { id?: string },
  ): Promise<{ entry: JournalEntry | null; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Prepare entry data
      const entryData = {
        user_id: user.id,
        title: this.shouldEncrypt()
          ? await encryptText(entry.title, user.id)
          : entry.title,
        content: this.shouldEncrypt()
          ? await encryptText(entry.content, user.id)
          : entry.content,
        date: entry.date,
        external_id: entry.id, // Store client-side ID as external_id
      };

      // Insert entry
      const { data, error } = await supabase
        .from("journal_entries")
        .insert([entryData])
        .select()
        .single();

      if (error)
        throw new SupabaseError("Failed to create journal entry", error);
      if (!data)
        throw new SupabaseError(
          "Entry creation succeeded but no entry returned",
        );

      // Map the returned entry to match the app's JournalEntry format
      const createdEntry: JournalEntry = {
        id: entry.id || data.id, // Use the original client ID if available
        title: data.title,
        content: data.content,
        date: data.date,
        chatId: entry.chatId,
      };

      return { entry: createdEntry, error: null };
    } catch (error) {
      console.error("Exception creating journal entry:", error);
      return {
        entry: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to create journal entry",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Get all journal entries for current user
   * @returns Array of journal entries
   */
  async getUserJournalEntries(): Promise<{
    entries: JournalEntry[];
    error: SupabaseError | null;
  }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get entries
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error)
        throw new SupabaseError("Failed to fetch journal entries", error);

      // Map to app's JournalEntry format
      const entries: JournalEntry[] = await Promise.all(
        data.map(async (entry) => ({
          id: entry.external_id || entry.id, // Prefer client ID if available
          title: isEncrypted(entry.title)
            ? await decryptText(entry.title, entry.user_id).catch(
              () => entry.title,
            )
            : entry.title,
          content: isEncrypted(entry.content)
            ? await decryptText(entry.content, entry.user_id).catch(
              () => entry.content,
            )
            : entry.content,
          date: entry.date,
          // We'll need to fetch chatId separately or via a join
        })),
      );

      return { entries, error: null };
    } catch (error) {
      console.error("Exception getting journal entries:", error);
      return {
        entries: [],
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to get journal entries",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Update a journal entry
   * @param entry Entry to update
   * @returns Success status or error
   */
  async updateJournalEntry(
    entry: JournalEntry,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Find the entry by external_id
      const { data: existingEntry, error: fetchError } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("external_id", entry.id)
        .eq("user_id", user.id)
        .single();

      if (fetchError)
        throw new SupabaseError("Failed to find journal entry", fetchError);
      if (!existingEntry) throw new SupabaseError("Entry not found");

      // Update the entry
      const { error } = await supabase
        .from("journal_entries")
        .update({
          title: this.shouldEncrypt()
            ? await encryptText(entry.title, user.id)
            : entry.title,
          content: this.shouldEncrypt()
            ? await encryptText(entry.content, user.id)
            : entry.content,
          date: entry.date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingEntry.id);

      if (error)
        throw new SupabaseError("Failed to update journal entry", error);

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception updating journal entry:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to update journal entry",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Delete a journal entry
   * @param entryId ID of entry to delete
   * @returns Success status or error
   */
  async deleteJournalEntry(
    entryId: string,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Find the entry by external_id
      const { data: existingEntry, error: fetchError } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("external_id", entryId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        // If not found by external_id, try direct id
        const { data: directEntry, error: directFetchError } =
          await supabase
            .from("journal_entries")
            .select("id")
            .eq("id", entryId)
            .eq("user_id", user.id)
            .single();

        if (directFetchError)
          throw new SupabaseError(
            "Failed to find journal entry",
            directFetchError,
          );
        if (!directEntry) throw new SupabaseError("Entry not found");

        // Delete the direct entry
        const { error } = await supabase
          .from("journal_entries")
          .delete()
          .eq("id", directEntry.id);

        if (error)
          throw new SupabaseError(
            "Failed to delete journal entry",
            error,
          );
      } else {
        // Delete the entry found by external_id
        const { error } = await supabase
          .from("journal_entries")
          .delete()
          .eq("id", existingEntry.id);

        if (error)
          throw new SupabaseError(
            "Failed to delete journal entry",
            error,
          );
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception deleting journal entry:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to delete journal entry",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Helper to check encryption capability
   */
  private shouldEncrypt(): boolean {
    return useSettingsStore.getState().enableEncryption;
  }
}