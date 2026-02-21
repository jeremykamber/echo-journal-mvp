import type { Conversation } from "@/store/conversationStore";
import type { Message } from "@/store/journalStore";
import type { IConversationService } from "./IConversationService";
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
 * Conversation service implementing IConversationService interface
 * Handles thread/conversation and message CRUD operations with encryption support
 */
export class ConversationService implements IConversationService {
  constructor(private authService: IAuthService) {}

  /**
   * Create a thread/conversation
   * @param thread Thread data
   * @returns Created thread or error
   */
  async createThread(
    thread: Partial<Conversation> & { entryId?: string },
  ): Promise<{ thread: Conversation | null; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get journal entry DB id if provided
      let journalEntryDbId: string | null = null;
      if (thread.entryId) {
        const { data: entry } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("external_id", thread.entryId)
          .eq("user_id", user.id)
          .single();

        if (entry) {
          journalEntryDbId = entry.id;
        }
      }

      // Create thread
      const threadData = {
        user_id: user.id,
        title:
          this.shouldEncrypt() && thread.title
            ? await encryptText(thread.title, user.id)
            : thread.title || "New Conversation",
        is_global: !thread.entryId,
        journal_entry_id: journalEntryDbId,
        external_id: thread.id, // Store the client-side ID
        created_at: thread.date || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("threads")
        .insert([threadData])
        .select()
        .single();

      if (error) throw new SupabaseError("Failed to create thread", error);
      if (!data)
        throw new SupabaseError(
          "Thread creation succeeded but no thread returned",
        );

      // Map to app's Conversation format
      const createdThread: Conversation = {
        id: thread.id || data.id,
        title: data.title,
        date: data.created_at,
        lastMessage: undefined,
        isGlobal: data.is_global,
      };

      return { thread: createdThread, error: null };
    } catch (error) {
      console.error("Exception creating thread:", error);
      return {
        thread: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to create thread",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Get all threads for current user
   * @returns Array of conversations
   */
  async getUserThreads(): Promise<{
    threads: Conversation[];
    error: SupabaseError | null;
  }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get threads
      const { data, error } = await supabase
        .from("threads")
        .select(
          `
          *,
          messages:messages(*, created_at)
        `,
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw new SupabaseError("Failed to fetch threads", error);

      // Map to app's Conversation format
      const threadsPromise: Promise<Conversation>[] = data.map(
        async (thread) => {
          // Find the latest message text for lastMessage
          let lastMessage: string | undefined;
          if (thread.messages && thread.messages.length > 0) {
            // Sort by timestamp and get the latest
            const latestMessage = [...thread.messages].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )[0];
            lastMessage = latestMessage.text;
          }

          return {
            id: thread.external_id || thread.id,
            title: isEncrypted(thread.title)
              ? await decryptText(thread.title, thread.user_id).catch(
                () => thread.title,
              )
              : thread.title,
            date: thread.created_at,
            lastMessage: isEncrypted(lastMessage ?? "")
              ? await decryptText(
                lastMessage ?? "",
                thread.user_id,
              ).catch(() => lastMessage)
              : lastMessage,
            isGlobal: thread.is_global,
          };
        },
      );

      const threads = await Promise.all(threadsPromise);

      return { threads, error: null };
    } catch (error) {
      console.error("Exception getting threads:", error);
      return {
        threads: [],
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to get threads",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Update a thread
   * @param threadId Thread ID
   * @param updates Updates to apply
   * @returns Success status or error
   */
  async updateThread(
    threadId: string,
    updates: Partial<Conversation>,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Find the thread by external_id
      const { data: existingThread, error: fetchError } = await supabase
        .from("threads")
        .select("id")
        .eq("external_id", threadId)
        .eq("user_id", user.id)
        .single();

      if (fetchError)
        throw new SupabaseError("Failed to find thread", fetchError);
      if (!existingThread) throw new SupabaseError("Thread not found");

      // Update the thread
      const { error } = await supabase
        .from("threads")
        .update({
          title:
            this.shouldEncrypt() && updates.title
              ? await encryptText(updates.title, user.id)
              : updates.title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingThread.id);

      if (error) throw new SupabaseError("Failed to update thread", error);

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception updating thread:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to update thread",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Delete a thread
   * @param threadId Thread ID
   * @returns Success status or error
   */
  async deleteThread(
    threadId: string,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Find the thread by external_id
      const { data: existingThread, error: fetchError } = await supabase
        .from("threads")
        .select("id")
        .eq("external_id", threadId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        // If not found by external_id, try direct id
        const { data: directThread, error: directFetchError } =
          await supabase
            .from("threads")
            .select("id")
            .eq("id", threadId)
            .eq("user_id", user.id)
            .single();

        if (directFetchError)
          throw new SupabaseError(
            "Failed to find thread",
            directFetchError,
          );
        if (!directThread) throw new SupabaseError("Thread not found");

        // Delete the direct thread
        const { error } = await supabase
          .from("threads")
          .delete()
          .eq("id", directThread.id);

        if (error)
          throw new SupabaseError("Failed to delete thread", error);
      } else {
        // Delete the thread found by external_id
        const { error } = await supabase
          .from("threads")
          .delete()
          .eq("id", existingThread.id);

        if (error)
          throw new SupabaseError("Failed to delete thread", error);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception deleting thread:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to delete thread",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Add a message to a thread
   * @param message Message to add
   * @returns Created message or error
   */
  async addMessage(
    message: Omit<Message, "messageId"> & {
      messageId?: string;
      threadId: string;
    },
  ): Promise<{ message: Message | null; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get thread DB id
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .select("id")
        .eq("external_id", message.threadId)
        .eq("user_id", user.id)
        .single();

      if (threadError || !thread) throw new SupabaseError("Thread not found");

      // Get journal entry DB id if provided
      let journalEntryDbId: string | null = null;
      if (message.entryId) {
        const { data: entry } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("external_id", message.entryId)
          .eq("user_id", user.id)
          .single();

        if (entry) {
          journalEntryDbId = entry.id;
        }
      }

      // Add message
      const messageData = {
        thread_id: thread.id,
        sender: message.sender,
        text: this.shouldEncrypt()
          ? await encryptText(message.text, user.id)
          : message.text,
        journal_entry_id: journalEntryDbId,
        is_realtime_reflection: message.isRealtimeReflection || false,
        reflected_content:
          this.shouldEncrypt() && message.reflectedContent
            ? await encryptText(message.reflectedContent, user.id)
            : message.reflectedContent,
        is_read: message.isRead || false,
        created_at: message.timestamp || new Date().toISOString(),
        external_id: message.messageId,
      };

      const { data, error } = await supabase
        .from("messages")
        .insert([messageData])
        .select()
        .single();

      if (error) throw new SupabaseError("Failed to add message", error);
      if (!data)
        throw new SupabaseError(
          "Message creation succeeded but no message returned",
        );

      // Update thread's updated_at
      await supabase
        .from("threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id);

      // Map to app's Message format
      const createdMessage: Message = {
        messageId: message.messageId || data.id,
        sender: data.sender,
        text: data.text,
        entryId: message.entryId,
        timestamp: data.created_at,
        threadId: message.threadId,
        isRealtimeReflection: data.is_realtime_reflection,
        reflectedContent: data.reflected_content,
        isRead: data.is_read,
      };

      return { message: createdMessage, error: null };
    } catch (error) {
      console.error("Exception adding message:", error);
      return {
        message: null,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to add message",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Get messages for a thread
   * @param threadId Thread ID
   * @returns Array of messages
   */
  async getMessagesForThread(
    threadId: string,
  ): Promise<{ messages: Message[]; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get thread DB id
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .select("id")
        .eq("external_id", threadId)
        .eq("user_id", user.id)
        .single();

      if (threadError || !thread) throw new SupabaseError("Thread not found");

      // Get messages
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          journal_entry:journal_entries(external_id)
        `,
        )
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });

      if (error) throw new SupabaseError("Failed to fetch messages", error);

      // Map to app's Message format
      const messages: Message[] = await Promise.all(
        data.map(async (msg) => ({
          messageId: msg.external_id || msg.id,
          sender: msg.sender,
          text: isEncrypted(msg.text)
            ? await decryptText(msg.text, user.id).catch(() => msg.text)
            : msg.text,
          entryId: msg.journal_entry?.external_id,
          timestamp: msg.created_at,
          threadId,
          isRealtimeReflection: msg.is_realtime_reflection,
          reflectedContent: isEncrypted(msg.reflected_content)
            ? await decryptText(msg.reflected_content, user.id).catch(
              () => msg.reflected_content,
            )
            : msg.reflected_content,
          isRead: msg.is_read,
        })),
      );

      return { messages, error: null };
    } catch (error) {
      console.error("Exception getting messages:", error);
      return {
        messages: [],
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to get messages",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Update a message
   * @param messageId Message ID
   * @param updates Updates to apply
   * @returns Success status or error
   */
  async updateMessage(
    messageId: string,
    updates: Partial<Message>,
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Find the message by external_id
      const { data: existingMessage, error: fetchError } = await supabase
        .from("messages")
        .select("id, thread_id, threads!inner(user_id)")
        .eq("external_id", messageId)
        .eq("threads.user_id", user.id)
        .single();

      if (fetchError)
        throw new SupabaseError("Failed to find message", fetchError);
      if (!existingMessage)
        throw new SupabaseError("Message not found or access denied");

      // Update allowed fields
      const updateData: {
        text?: string;
        is_read?: boolean;
      } = {};
      if (updates.text !== undefined) {
        updateData.text = this.shouldEncrypt()
          ? await encryptText(updates.text, user.id)
          : updates.text;
      }
      if (updates.isRead !== undefined) updateData.is_read = updates.isRead;

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("messages")
          .update(updateData)
          .eq("id", existingMessage.id);

        if (error)
          throw new SupabaseError("Failed to update message", error);

        // If updating text, also update thread's updated_at
        if (updates.text) {
          await supabase
            .from("threads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", existingMessage.thread_id);
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception updating message:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to update message",
              error instanceof Error
                ? error
                : new Error(String(error)),
            ),
      };
    }
  }

  /**
   * Mark all messages in a thread as read
   * @param threadId Thread ID
   * @param options Filter options
   * @returns Success status or error
   */
  async markAllMessagesAsRead(
    threadId: string,
    options?: { sender?: "user" | "ai" },
  ): Promise<{ success: boolean; error: SupabaseError | null }> {
    try {
      // Get current user
      const { user, error: authError } = await this.authService.getCurrentUser();
      if (authError || !user) throw new SupabaseError("Not authenticated");

      // Get thread DB id
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .select("id")
        .eq("external_id", threadId)
        .eq("user_id", user.id)
        .single();

      if (threadError || !thread) throw new SupabaseError("Thread not found");

      // Build query
      let query = supabase
        .from("messages")
        .update({ is_read: true })
        .eq("thread_id", thread.id);

      // Apply sender filter if provided
      if (options?.sender) {
        query = query.eq("sender", options.sender);
      }

      // Execute update
      const { error } = await query;

      if (error)
        throw new SupabaseError("Failed to mark messages as read", error);

      return { success: true, error: null };
    } catch (error) {
      console.error("Exception marking messages as read:", error);
      return {
        success: false,
        error:
          error instanceof SupabaseError
            ? error
            : new SupabaseError(
              "Failed to mark messages as read",
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