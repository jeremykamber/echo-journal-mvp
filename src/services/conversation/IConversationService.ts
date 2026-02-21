import type { Conversation, Message } from "@/store/conversationStore";
import type { SupabaseError } from "@/services/supabaseService";

/**
 * Interface for conversation/thread service
 */
export interface IConversationService {
  /**
   * Create a thread/conversation
   * @param thread Thread data
   * @returns Created thread or error
   */
  createThread(
    thread: Partial<Conversation> & { entryId?: string },
  ): Promise<{ thread: Conversation | null; error: SupabaseError | null }>;

  /**
   * Get all threads for current user
   * @returns Array of conversations
   */
  getUserThreads(): Promise<{
    threads: Conversation[];
    error: SupabaseError | null;
  }>;

  /**
   * Update a thread
   * @param threadId Thread ID
   * @param updates Updates to apply
   * @returns Success status or error
   */
  updateThread(
    threadId: string,
    updates: Partial<Conversation>,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Delete a thread
   * @param threadId Thread ID
   * @returns Success status or error
   */
  deleteThread(
    threadId: string,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Add a message to a thread
   * @param message Message to add
   * @returns Created message or error
   */
  addMessage(
    message: Omit<Message, "messageId"> & {
      messageId?: string;
      threadId: string;
    },
  ): Promise<{ message: Message | null; error: SupabaseError | null }>;

  /**
   * Get messages for a thread
   * @param threadId Thread ID
   * @returns Array of messages
   */
  getMessagesForThread(
    threadId: string,
  ): Promise<{ messages: Message[]; error: SupabaseError | null }>;

  /**
   * Update a message
   * @param messageId Message ID
   * @param updates Updates to apply
   * @returns Success status or error
   */
  updateMessage(
    messageId: string,
    updates: Partial<Message>,
  ): Promise<{ success: boolean; error: SupabaseError | null }>;

  /**
   * Mark all messages in a thread as read
   * @param threadId Thread ID
   * @param options Filter options
   * @returns Success status or error
   */
  markAllMessagesAsRead(
    threadId: string,
    options?: { sender?: "user" | "ai" },
  ): Promise<{ success: boolean; error: SupabaseError | null }>;
}