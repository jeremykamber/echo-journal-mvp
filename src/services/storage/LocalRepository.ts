import localforage from 'localforage';
import type { IDataRepository, StashItem } from './types';
import type { JournalEntry, Message as JournalMessage } from '@/store/journalStore';
import type { Conversation, Message as ConversationMessage } from '@/store/conversationStore';

const KEYS = {
  ENTRIES: 'journal_entries',
  CONVERSATIONS: 'conversations',
  GLOBAL_MESSAGES: 'conversation_messages',
  JOURNAL_MESSAGES: 'journal_messages',
  STASH: 'stash_items'
};

export class LocalRepository implements IDataRepository {
  // --- Journal Entries ---
  async getJournalEntries(): Promise<JournalEntry[]> {
    return (await localforage.getItem<JournalEntry[]>(KEYS.ENTRIES)) || [];
  }

  async createJournalEntry(entry: JournalEntry): Promise<JournalEntry> {
    const entries = await this.getJournalEntries();
    entries.push(entry);
    await localforage.setItem(KEYS.ENTRIES, entries);
    return entry;
  }

  async updateJournalEntry(entry: JournalEntry): Promise<void> {
    const entries = await this.getJournalEntries();
    const index = entries.findIndex(e => e.id === entry.id);
    if (index !== -1) {
      entries[index] = entry;
      await localforage.setItem(KEYS.ENTRIES, entries);
    }
  }

  async deleteJournalEntry(id: string): Promise<void> {
    const entries = await this.getJournalEntries();
    const filtered = entries.filter(e => e.id !== id);
    await localforage.setItem(KEYS.ENTRIES, filtered);
  }

  // --- Conversations ---
  async getConversations(): Promise<Conversation[]> {
    return (await localforage.getItem<Conversation[]>(KEYS.CONVERSATIONS)) || [];
  }

  async createConversation(conversation: Conversation): Promise<void> {
    const conversations = await this.getConversations();
    conversations.push(conversation);
    await localforage.setItem(KEYS.CONVERSATIONS, conversations);
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    const conversations = await this.getConversations();
    const index = conversations.findIndex(c => c.id === conversation.id);
    if (index !== -1) {
      conversations[index] = conversation;
      await localforage.setItem(KEYS.CONVERSATIONS, conversations);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    const conversations = await this.getConversations();
    const filtered = conversations.filter(c => c.id !== id);
    await localforage.setItem(KEYS.CONVERSATIONS, filtered);
  }

  // --- Global Messages ---
  async getMessagesForConversation(conversationId: string): Promise<ConversationMessage[]> {
    const allMessages = (await localforage.getItem<ConversationMessage[]>(KEYS.GLOBAL_MESSAGES)) || [];
    return allMessages.filter(m => m.conversationId === conversationId);
  }

  async addMessageToConversation(message: ConversationMessage): Promise<void> {
    const allMessages = (await localforage.getItem<ConversationMessage[]>(KEYS.GLOBAL_MESSAGES)) || [];
    allMessages.push(message);
    await localforage.setItem(KEYS.GLOBAL_MESSAGES, allMessages);
  }

  // Generic update for either message type, but typically handled by specific stores
  // We'll fix this to handle both if needed, but for now assuming global messages context generally
  async updateMessage(messageId: string, content: string): Promise<void> {
    // Check global first
    const globalMessages = (await localforage.getItem<ConversationMessage[]>(KEYS.GLOBAL_MESSAGES)) || [];
    const gIndex = globalMessages.findIndex(m => m.messageId === messageId);
    if (gIndex !== -1) {
      globalMessages[gIndex].text = content;
      await localforage.setItem(KEYS.GLOBAL_MESSAGES, globalMessages);
      return;
    }

    // Check journal messages
    const journalMessages = (await localforage.getItem<JournalMessage[]>(KEYS.JOURNAL_MESSAGES)) || [];
    const jIndex = journalMessages.findIndex(m => m.messageId === messageId);
    if (jIndex !== -1) {
      journalMessages[jIndex].text = content;
      await localforage.setItem(KEYS.JOURNAL_MESSAGES, journalMessages);
    }
  }

  // --- Journal Messages ---
  async getMessagesForJournalEntry(entryId: string, threadId: string): Promise<JournalMessage[]> {
    const allMessages = (await localforage.getItem<JournalMessage[]>(KEYS.JOURNAL_MESSAGES)) || [];
    // Filter by threadId primarily as that's unique to the chat session
    return allMessages.filter(m => m.threadId === threadId);
  }

  async addMessageToJournalEntry(message: JournalMessage): Promise<void> {
    const allMessages = (await localforage.getItem<JournalMessage[]>(KEYS.JOURNAL_MESSAGES)) || [];
    allMessages.push(message);
    await localforage.setItem(KEYS.JOURNAL_MESSAGES, allMessages);
  }

  // --- Stash ---
  async getStash(): Promise<StashItem[]> {
    return (await localforage.getItem<StashItem[]>(KEYS.STASH)) || [];
  }

  async addToStash(item: Omit<StashItem, 'stashItemId' | 'userId' | 'stashedAt'>): Promise<void> {
    const stash = await this.getStash();
    const newItem: StashItem = {
      ...item,
      stashItemId: crypto.randomUUID(),
      userId: 'local-user', // No real auth in local mode
      stashedAt: new Date().toISOString()
    };
    stash.push(newItem);
    // Sort by stashedAt date desc
    stash.sort((a, b) => new Date(b.stashedAt).getTime() - new Date(a.stashedAt).getTime());
    await localforage.setItem(KEYS.STASH, stash);
  }

  async removeFromStash(id: string): Promise<void> {
    const stash = await this.getStash();
    const filtered = stash.filter(i => i.stashItemId !== id);
    await localforage.setItem(KEYS.STASH, filtered);
  }
}
