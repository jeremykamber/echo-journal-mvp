import type { JournalEntry, Message as JournalMessage } from '@/store/journalStore';
import type { Conversation, Message as ConversationMessage } from '@/store/conversationStore';
// Redefining StashItem here to avoid importing implementation details from supabaseService
// but ideally we should extract it to a shared types file.
export type StashSourceType = 'journal' | 'conversation';

export interface StashItem {
  stashItemId: string;
  userId: string;
  reflectionText: string;
  sourceType: StashSourceType;
  sourceId: string;
  sourceTitleOrDate: string;
  createdAt: string;
  stashedAt: string;
}

export interface IDataRepository {
  // Journal Entries
  getJournalEntries(): Promise<JournalEntry[]>;
  createJournalEntry(entry: JournalEntry): Promise<JournalEntry>;
  updateJournalEntry(entry: JournalEntry): Promise<void>;
  deleteJournalEntry(id: string): Promise<void>;

  // Global Conversations
  getConversations(): Promise<Conversation[]>;
  createConversation(conversation: Conversation): Promise<void>;
  updateConversation(conversation: Conversation): Promise<void>;
  deleteConversation(id: string): Promise<void>;

  // Global Messages
  getMessagesForConversation(conversationId: string): Promise<ConversationMessage[]>;
  addMessageToConversation(message: ConversationMessage): Promise<void>;
  updateMessage(messageId: string, content: string): Promise<void>; // Unified update

  // Journal Entry specific Messages
  getMessagesForJournalEntry(entryId: string, threadId: string): Promise<JournalMessage[]>;
  addMessageToJournalEntry(message: JournalMessage): Promise<void>;

  // Stash
  getStash(): Promise<StashItem[]>;
  addToStash(item: Omit<StashItem, 'stashItemId' | 'userId' | 'stashedAt'>): Promise<void>;
  removeFromStash(id: string): Promise<void>;
}
