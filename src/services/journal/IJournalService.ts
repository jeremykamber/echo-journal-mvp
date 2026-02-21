import type { JournalEntry } from "@/store/journalStore";
import type { SupabaseError } from "@/services/supabaseService";

/**
 * Interface for journal service
 */
export interface IJournalService {
  /**
   * Create a journal entry
   * @param entry Journal entry data
   * @returns Created entry or error
   */
  createJournalEntry(
    entry: Omit<JournalEntry, "id"> & { id?: string },
  ): Promise<{ entry: JournalEntry | null; error: SupabaseError | null }>;

  /**
   * Get all journal entries for current user
   * @returns Array of journal entries
   */
  getUserJournalEntries(): Promise<{
    entries: JournalEntry[];
    error: SupabaseError | null;
  }>;

  /**
   * Update a journal entry
   * @param entry Entry to update
   * @returns Success status or error
   */
  updateJournalEntry(
    entry: JournalEntry,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Delete a journal entry
   * @param entryId ID of entry to delete
   * @returns Success status or error
   */
  deleteJournalEntry(
    entryId: string,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;
}