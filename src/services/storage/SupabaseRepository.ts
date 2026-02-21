import type { IDataRepository, StashItem } from './types';
import type { JournalEntry, Message as JournalMessage } from '@/store/journalStore';
import type { Conversation, Message as ConversationMessage } from '@/store/conversationStore';
import type { IAuthService } from '../auth/IAuthService';
import type { IJournalService } from '../journal/IJournalService';
import type { IConversationService } from '../conversation/IConversationService';
import type { IFeedbackService } from '../feedback/IFeedbackService';

export class SupabaseRepository implements IDataRepository {
  constructor(
    _authService: IAuthService,
    private journalService: IJournalService,
    private conversationService: IConversationService,
    private feedbackService: IFeedbackService,
  ) {}
  // --- Journal Entries ---
  async getJournalEntries(): Promise<JournalEntry[]> {
    const { entries, error } = await this.journalService.getUserJournalEntries();
    if (error) {
      console.error('SupabaseRepository: Failed to get journal entries', error);
      // We might want to throw here or return empty array depending on error handling strategy.
      // For now, logging and returning empty is safer to prevent crashing.
      return [];
    }
    return entries;
  }

  async createJournalEntry(entry: JournalEntry): Promise<JournalEntry> {
    const { entry: created, error } = await this.journalService.createJournalEntry({
      ...entry,
      id: entry.id // Explicitly passing client ID as external ID
    });
    if (error || !created) {
      throw error || new Error('Failed to create journal entry');
    }
    return created;
  }

  async updateJournalEntry(entry: JournalEntry): Promise<void> {
    const { error } = await this.journalService.updateJournalEntry(entry);
    if (error) throw error;
  }

  async deleteJournalEntry(id: string): Promise<void> {
    const { error } = await this.journalService.deleteJournalEntry(id);
    if (error) throw error;
  }

  // --- Conversations ---
  async getConversations(): Promise<Conversation[]> {
    const { threads, error } = await this.conversationService.getUserThreads();
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
    const { error } = await this.conversationService.createThread({
      ...conversation,
      // If it's linked to an entry, it might be separate, but createThread handles it
      id: conversation.id,
      isGlobal: conversation.isGlobal
    });
    if (error) throw error;
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    const { error } = await this.conversationService.updateThread(conversation.id, {
      title: conversation.title
      // other fields if needed
    });
    if (error) throw error;
  }

  async deleteConversation(id: string): Promise<void> {
    const { error } = await this.conversationService.deleteThread(id);
    if (error) throw error;
  }

  // --- Global Messages ---
  async getMessagesForConversation(conversationId: string): Promise<ConversationMessage[]> {
    const { messages, error } = await this.conversationService.getMessagesForThread(conversationId);
    if (error) {
      console.error('SupabaseRepository: Failed to get messages', error);
      return [];
    }
    // Map Journal Message type (returned by service) to Conversation Message type
    return messages.map((m: JournalMessage) => ({
      sender: m.sender,
      messageId: m.messageId,
      text: m.text,
      entryId: m.entryId,
      timestamp: m.timestamp,
      conversationId: m.threadId // service returns threadId
    }));
  }

  async addMessageToConversation(message: ConversationMessage): Promise<void> {
    const { error } = await this.conversationService.addMessage({
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
    const { error } = await this.conversationService.updateMessage(messageId, { text: content });
    if (error) throw error;
  }


  // --- Journal Messages ---
  async getMessagesForJournalEntry(_entryId: string, threadId: string): Promise<JournalMessage[]> {
    const { messages, error } = await this.conversationService.getMessagesForThread(threadId);
    if (error) {
      console.error('SupabaseRepository: Failed to get messages for entry', error);
      return [];
    }
    return messages;
  }

  async addMessageToJournalEntry(message: JournalMessage): Promise<void> {
    const { error } = await this.conversationService.addMessage({
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
    const { items, error } = await this.feedbackService.getStash();
    if (error) {
      console.error('SupabaseRepository: Failed to get stash', error);
      return [];
    }
    return items;
  }

  async addToStash(item: Omit<StashItem, 'stashItemId' | 'userId' | 'stashedAt'>): Promise<void> {
    const { error } = await this.feedbackService.stashReflection({
      reflectionText: item.reflectionText,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceTitleOrDate: item.sourceTitleOrDate,
      createdAt: item.createdAt
    });
    if (error) throw error;
  }

  async removeFromStash(id: string): Promise<void> {
    const { error } = await this.feedbackService.unstashReflection(id);
    if (error) throw error;
  }
}
