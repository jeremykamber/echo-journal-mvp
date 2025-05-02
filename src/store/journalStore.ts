import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // Import and alias uuid
import {
    trackCreateEntry,
    trackDeleteEntry,
    trackSendMessage,
    trackEvent, // Import generic trackEvent
} from '@/services/analyticsService';

export interface JournalEntry {
    id: string;
    title: string;
    content: string;
    date: string;
    chatId?: string; // Thread ID for entry-specific chat history
}

export interface Message {
    messageId: string; // Unique ID for each message
    sender: 'user' | 'ai';
    text: string;
    entryId?: string; // Optional citation link
    timestamp: string;
    threadId: string; // Which thread this message belongs to
    isRealtimeReflection?: boolean; // Special flag for realtime reflections
    reflectedContent?: string; // The journal content that was reflected on
}

export interface JournalState {
    entries: JournalEntry[];
    messages: Message[];
    addMessage: (sender: 'user' | 'ai', text: string, threadId: string, entryId?: string, isRealtimeReflection?: boolean, reflectedContent?: string) => string;
    updateEntry: (id: string, content: string) => void;
    updateEntryTitle: (id: string, title: string) => void;
    updateLastMessage: (text: string) => void;
    getEntryById: (id: string) => JournalEntry | undefined;
    createEntry: () => string; // Returns the ID of the newly created entry
    deleteEntry: (id: string) => void; // Delete a journal entry by ID

    // Batch import capabilities
    createEntryWithData: (title: string, content: string, date?: string) => string;
    bulkImportEntries: (entries: Omit<JournalEntry, 'id'>[]) => string[];

    // Thread management for entry-specific chats
    activeThreadId: string;
    setActiveThreadId: (threadId: string) => void;
    getMessagesForThread: (threadId: string) => Message[];
    createThreadForEntry: (entryId: string) => string;

    // Update message by ID
    updateMessageById: (messageId: string, newText: string) => void;
}

// Define a constant for the global chat thread
const GLOBAL_THREAD_ID = 'global-chat';

const useJournalStore = create<JournalState>()(
    persist(
        (set, get) => ({
            entries: [],
            activeThreadId: GLOBAL_THREAD_ID,
            messages: [],
            addMessage: (sender, text, threadId, entryId, isRealtimeReflection = false, reflectedContent) => {
                const messageId = uuidv4(); // Generate a unique message ID
                set((state) => ({
                    messages: [
                        ...state.messages,
                        {
                            messageId,
                            sender,
                            text,
                            timestamp: new Date().toISOString(),
                            entryId,
                            threadId,
                            isRealtimeReflection,
                            ...(reflectedContent ? { reflectedContent } : {}),
                        },
                    ],
                }));
                // Track user messages and AI reflections
                if (sender === 'user') {
                    trackSendMessage();
                } else if (isRealtimeReflection) {
                    trackEvent('AI', 'AddRealtimeReflection', threadId); // Track reflection addition
                }
                return messageId; // Return the generated message ID
            },
            updateEntry: (id, content) =>
                set((state) => ({
                    entries: state.entries.map((e) => (e.id === id ? { ...e, content } : e)),
                })),
            updateEntryTitle: (id, title) =>
                set((state) => ({
                    entries: state.entries.map((e) => (e.id === id ? { ...e, title } : e)),
                })),
            getEntryById: (id) => get().entries.find((e) => e.id === id),
            updateLastMessage: (text: string) =>
                set((state) => ({
                    messages: state.messages.map((m, idx) =>
                        idx === state.messages.length - 1 ? { ...m, text } : m
                    ),
                })),
            createEntry: () => {
                const id = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const newEntry = {
                    id,
                    title: `Journal Entry ${new Date().toLocaleDateString()}`,
                    content: '',
                    date: new Date().toISOString(),
                };
                set((state) => ({ entries: [...state.entries, newEntry] }));
                trackCreateEntry(); // Track entry creation
                return id;
            },
            deleteEntry: (id) => {
                const entryToDelete = get().getEntryById(id);
                const threadId = entryToDelete?.chatId;

                set((state) => ({
                    entries: state.entries.filter((entry) => entry.id !== id),
                    messages: state.messages.filter(
                        (message) =>
                            message.entryId !== id &&
                            (threadId ? message.threadId !== threadId : true)
                    ),
                    ...(threadId && state.activeThreadId === threadId
                        ? { activeThreadId: GLOBAL_THREAD_ID }
                        : {}),
                }));
                trackDeleteEntry(); // Track entry deletion
            },
            createEntryWithData: (title, content, date) => {
                const id = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const newEntry = {
                    id,
                    title: title || `Journal Entry ${new Date().toLocaleDateString()}`,
                    content,
                    date: date || new Date().toISOString(),
                };
                set((state) => ({ entries: [...state.entries, newEntry] }));
                // Note: Tracking for imports is handled in DocumentImporter via trackImportDocument
                // If created manually via this function elsewhere, consider adding trackCreateEntry() here too.
                return id;
            },
            bulkImportEntries: (newEntries) => {
                const ids: string[] = [];
                let importedCount = 0; // Keep track of count for analytics

                set((state) => {
                    const importedEntries = newEntries.map((entry) => {
                        const id = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${ids.length}`;
                        ids.push(id);
                        return {
                            ...entry,
                            id,
                        };
                    });
                    importedCount = importedEntries.length; // Store count
                    return { entries: [...state.entries, ...importedEntries] };
                });

                // Track bulk import completion
                if (importedCount > 0) {
                    trackEvent('Journal', 'BulkImportComplete', `Count: ${importedCount}`);
                }

                return ids;
            },
            setActiveThreadId: (threadId) => set({ activeThreadId: threadId }),
            getMessagesForThread: (threadId) => {
                return get().messages.filter((message) => message.threadId === threadId);
            },
            createThreadForEntry: (entryId) => {
                const newThreadId = `entry-${entryId}-${Date.now()}`;
                set((state) => ({
                    entries: state.entries.map((entry) =>
                        entry.id === entryId ? { ...entry, chatId: newThreadId } : entry
                    ),
                }));
                return newThreadId;
            },
            updateMessageById: (messageId, newText) => {
                set((state) => ({
                    messages: state.messages.map((message) =>
                        message.messageId === messageId ? { ...message, text: newText } : message
                    ),
                }));
            },
        }),
        {
            name: 'journal-storage',
        }
    )
);

export default useJournalStore;
