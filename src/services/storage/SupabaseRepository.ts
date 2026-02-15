import * as supabaseService from '@/services/supabaseService';
import type { IDataRepository, StashItem } from './types';
import type { JournalEntry, Message as JournalMessage } from '@/store/journalStore';
import type { Conversation, Message as ConversationMessage } from '@/store/conversationStore';

export class SupabaseRepository implements IDataRepository {
  // --- Journal Entries ---
  async getJournalEntries(): Promise<JournalEntry[]> {
    const { entries, error } = await supabaseService.getUserJournalEntries();
    if (error) {
      console.error('SupabaseRepository: Failed to get journal entries', error);
      // We might want to throw here or return empty array depending on error handling strategy.
      // For now, logging and returning empty is safer to prevent crashing.
      return [];
    }
    return entries;
  }

  async createJournalEntry(entry: JournalEntry): Promise<JournalEntry> {
    const { entry: created, error } = await supabaseService.createJournalEntry({
      ...entry,
      id: entry.id // Explicitly passing client ID as external ID
    });
    if (error || !created) {
      throw error || new Error('Failed to create journal entry');
    }
    return created;
  }

  async updateJournalEntry(entry: JournalEntry): Promise<void> {
    const { error } = await supabaseService.updateJournalEntry(entry);
    if (error) throw error;
  }

  async deleteJournalEntry(id: string): Promise<void> {
    const { error } = await supabaseService.deleteJournalEntry(id);
    if (error) throw error;
  }

  // --- Conversations ---
  async getConversations(): Promise<Conversation[]> {
    const { threads, error } = await supabaseService.getUserThreads();
    if (error) {
      console.error('SupabaseRepository: Failed to get threads', error);
      return [];
    }
    // Filter global vs non-global?
    // The store typically holds all conversations.
    // `getUserThreads` returns all threads.
    return threads;
  }

  async createConversation(conversation: Conversation): Promise<void> {
    const { error } = await supabaseService.createThread({
      ...conversation,
      // If it's linked to an entry, it might be separate, but createThread handles it
      id: conversation.id,
      isGlobal: conversation.isGlobal
    });
    if (error) throw error;
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    const { error } = await supabaseService.updateThread(conversation.id, {
      title: conversation.title
      // other fields if needed
    });
    if (error) throw error;
  }

  async deleteConversation(id: string): Promise<void> {
    const { error } = await supabaseService.deleteThread(id);
    if (error) throw error;
  }

  // --- Global Messages ---
  async getMessagesForConversation(conversationId: string): Promise<ConversationMessage[]> {
    const { messages, error } = await supabaseService.getMessagesForThread(conversationId);
    if (error) {
      console.error('SupabaseRepository: Failed to get messages', error);
      return [];
    }
    // Map Journal Message type (returned by service) to Conversation Message type?
    // They are slightly different interfaces in the store definitions.
    // Service returns `Message` (from journalStore context predominantly in import).
    // Conversation store message: { sender, messageId, text, entryId, timestamp, conversationId }
    // Service Message: { messageId, sender, text, entryId, timestamp, threadId, isRealtimeReflection, ... }

    return messages.map(m => ({
      sender: m.sender,
      messageId: m.messageId,
      text: m.text,
      entryId: m.entryId,
      timestamp: m.timestamp,
      conversationId: m.threadId // service returns threadId
    }));
  }

  async addMessageToConversation(message: ConversationMessage): Promise<void> {
    const { error } = await supabaseService.addMessage({
      messageId: message.messageId,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
      entryId: message.entryId,
      threadId: message.conversationId,
      // defaults for reflection info
    });
    if (error) throw error;
  }

  // --- Generic Update ---
  async updateMessage(messageId: string, content: string): Promise<void> {
    const { error } = await supabaseService.updateMessage(messageId, { text: content });
    if (error) throw error;
  }


  // --- Journal Messages ---
  async getMessagesForJournalEntry(entryId: string, threadId: string): Promise<JournalMessage[]> {
    const { messages, error } = await supabaseService.getMessagesForThread(threadId);
    if (error) {
      console.error('SupabaseRepository: Failed to get messages for entry', error);
      return [];
    }
    return messages;
  }

  async addMessageToJournalEntry(message: JournalMessage): Promise<void> {
    const { error } = await supabaseService.addMessage({
      messageId: message.messageId,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
      entryId: message.entryId,
      threadId: message.threadId,
      isRealtimeReflection: message.isRealtimeReflection,
      reflectedContent: message.reflectedContent,
      isRead: message.isRead
    });
    if (error) throw error;
  }

  // --- Stash ---
  async getStash(): Promise<StashItem[]> {
    const { items, error } = await supabaseService.getStash();
    if (error) {
      console.error('SupabaseRepository: Failed to get stash', error);
      return [];
    }
    return items;
  }

  async addToStash(item: Omit<StashItem, 'stashItemId' | 'userId' | 'stashedAt'>): Promise<void> {
    const { error } = await supabaseService.stashReflection({
      reflectionText: item.reflectionText,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceTitleOrDate: item.sourceTitleOrDate,
      createdAt: item.createdAt
    });
    if (error) throw error;
  }

  async removeFromStash(id: string): Promise<void> {
    const { error } = await supabaseService.unstashReflection(id);
    if (error) throw error;
  }
}
