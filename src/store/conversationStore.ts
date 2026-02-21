import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { robustStorage } from '@/lib/robustStorage';
import { v4 as uuidv4 } from 'uuid';
import { streamReflectionTokens } from '@/services/aiService';
import { autoSaveMessage } from '@/services/memoryAutoSave';
import { getRepository } from '@/services/storage/RepositoryFactory';

export interface Message {
    sender: 'user' | 'ai';
    messageId: string; // Unique identifier for the message
    text: string;
    entryId?: string; // optional citation link
    timestamp: string;
    conversationId: string; // Which conversation this message belongs to
}

export interface Conversation {
    id: string;
    title: string;
    date: string;
    lastMessage?: string; // Preview of the last message
    isGlobal?: boolean; // Whether this is a global conversation
}

export interface ConversationState {
    conversations: Conversation[];
    messages: Message[];
    activeConversationId: string | null;

    // Message management
    addMessage: (sender: 'user' | 'ai', text: string, conversationId: string, entryId?: string, messageId?: string) => string;
    updateLastMessage: (conversationId: string, text: string) => void;
    updateMessageById: (messageId: string, newText: string) => void;
    getMessagesForConversation: (conversationId: string) => Message[];
    appendAIToken: (conversationId: string, token: string) => void;

    // Conversation management
    setActiveConversationId: (conversationId: string | null) => void;
    createConversation: (title: string | null) => string; // Returns the conversation ID
    updateConversationTitle: (id: string, title: string) => void;
    getConversationById: (id: string) => Conversation | undefined;
    getConversations: () => Conversation[];
    deleteConversation: (id: string) => void;

    sendMessageWithReflection: (input: string, threadId: string, entryId?: string) => Promise<void>;

    // Sync
    syncFromStorage: () => Promise<void>;
}

const useConversationStore = create<ConversationState>()(
    persist(
        (set, get) => ({
            conversations: [],
            messages: [],
            activeConversationId: null,

            // Message management
            addMessage: (sender, text, conversationId, entryId, messageId) => {
                if (!messageId) {
                    messageId = uuidv4(); // Generate a new message ID if not provided
                }
                const timestamp = new Date().toISOString();

                set((state) => ({
                    messages: [
                        ...state.messages,
                        {
                            messageId,
                            sender,
                            text,
                            timestamp,
                            entryId,
                            conversationId
                        },
                    ],
                }));

                // Auto-save to index into vector store
                void autoSaveMessage({
                    messageId,
                    sender,
                    text,
                    timestamp,
                    threadId: conversationId,
                    entryId
                });

                // Update last message in conversation
                if (sender === 'user') {
                    set((state) => ({
                        conversations: state.conversations.map((c) =>
                            c.id === conversationId ? { ...c, lastMessage: text } : c
                        ),
                    }));
                }

                return messageId; // Return timestamp as message identifier
            },

            updateLastMessage: (conversationId, text) => {
                set((state) => {
                    const conversationMessages = state.messages.filter(
                        m => m.conversationId === conversationId
                    );

                    if (conversationMessages.length === 0) {
                        return state;
                    }

                    const lastMessageIndex = state.messages.findIndex(
                        m => m.timestamp === conversationMessages[conversationMessages.length - 1].timestamp
                    );

                    if (lastMessageIndex === -1) {
                        return state;
                    }

                    const newMessages = [...state.messages];
                    newMessages[lastMessageIndex].text = text;

                    return { messages: newMessages };
                });
            },

            updateMessageById: (messageId, newText) => {
                set((state) => {
                    const messageIndex = state.messages.findIndex(
                        m => m.messageId === messageId
                    );

                    if (messageIndex === -1) {
                        return state;
                    }

                    const newMessages = [...state.messages];
                    newMessages[messageIndex].text = newText;

                    return { messages: newMessages };
                });
            },

            getMessagesForConversation: (conversationId) => {
                return get().messages.filter((message) => message.conversationId === conversationId);
            },

            appendAIToken: (conversationId, token) => {
                set((state) => {
                    const conversationMessages = state.messages.filter(
                        (m) => m.conversationId === conversationId
                    );

                    if (conversationMessages.length === 0) {
                        return state;
                    }

                    const lastMessage = conversationMessages[conversationMessages.length - 1];

                    if (lastMessage.sender === 'ai') {
                        // Update the last AI message
                        const updatedMessages = state.messages.map((message) =>
                            message.messageId === lastMessage.messageId
                                ? { ...message, text: message.text + token }
                                : message
                        );
                        return { messages: updatedMessages };
                    } else {
                        // Add a new AI message
                        const newMessage: Message = {
                            sender: 'ai',
                            messageId: uuidv4(),
                            text: token,
                            timestamp: new Date().toISOString(),
                            conversationId,
                        };
                        const updatedMessages = [...state.messages, newMessage];

                        // Auto-save to index into vector store
                        void autoSaveMessage({
                            messageId: newMessage.messageId,
                            sender: newMessage.sender,
                            text: newMessage.text,
                            timestamp: newMessage.timestamp,
                            threadId: conversationId,
                            entryId: undefined,
                        });

                        // Persist via Repository
                        void getRepository().addMessageToConversation({
                            messageId: newMessage.messageId,
                            sender: newMessage.sender,
                            text: newMessage.text,
                            timestamp: newMessage.timestamp,
                            conversationId,
                            entryId: undefined
                        });

                        return { messages: updatedMessages };
                    }
                });
            },

            // Conversation management
            setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),

            createConversation: (title?) => {
                const id = uuidv4(); // Generate a unique ID for the conversation
                const newConversation: Conversation = {
                    id,
                    title: title
                        ? title
                        : `New Conversation ${new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        })}`,
                    date: new Date().toISOString(),
                    lastMessage: undefined, // Ensure lastMessage is undefined
                };

                set((state) => ({
                    conversations: [...state.conversations, newConversation],
                    activeConversationId: id,
                }));

                void getRepository().createConversation(newConversation);

                return id;
            },

            updateConversationTitle: (id, title) =>
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.id === id ? { ...c, title } : c
                    ),
                })),

            getConversationById: (id) => get().conversations.find((c) => c.id === id),

            getConversations: () => get().conversations,

            deleteConversation: (id) => {
                set((state) => ({
                    conversations: state.conversations.filter((c) => c.id !== id),
                    messages: state.messages.filter((m) => m.conversationId !== id),
                    activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
                }));
                void getRepository().deleteConversation(id);
            },

            sendMessageWithReflection: async (input, threadId, entryId) => {
                get().addMessage('user', input, threadId, entryId); // Add user message
                await streamReflectionTokens(
                    input,
                    'conversation',
                    entryId,
                );
            },

            syncFromStorage: async () => {
                const repo = getRepository();
                const conversations = await repo.getConversations();

                // Messages fetch? 
                // We might need to fetch messages per conversation or just all.
                // For simplified sync, let's just sync conversations list for now.
                // The individual messages might need `getMessagesForConversation(id)` when opening it.
                // BUT, the store usually keeps all messages.
                // This complicates things. 
                // Let's assume for now we don't load all messages on startup, ONLY when clicked?
                // But the store structure holds `messages: Message[]` globally.
                set({ conversations });
            }
        }),
        {
            name: 'conversation-storage',
            storage: createJSONStorage(() => robustStorage),
        }
    )
);

export default useConversationStore;
