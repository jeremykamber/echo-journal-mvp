import React, { useState, useRef, useEffect } from 'react';
import useJournalStore, { JournalState } from '@/store/journalStore';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { parseReflectionWithCitations } from '@/lib/parseReflectionWithCitations';
import { useShallow } from 'zustand/shallow';
import { useAI } from '@/context/AIContext'; // ✅ New import
import { streamRealtimeReflection } from '@/services/aiService';
import { useDebounce } from '@/hooks/useDebounce';
import { getEmbeddingSimilarity } from '@/services/llmService'; // We'll add this utility

const GLOBAL_THREAD_ID = 'global-chat';

interface ChatPanelProps {
    entryId?: string;
    hasStartedEditing?: boolean;
}

const REFLECTION_SIMILARITY_THRESHOLD = 0.90;

const ChatPanel: React.FC<ChatPanelProps> = ({ entryId, hasStartedEditing }) => {
    const createThreadForEntry = useJournalStore((state: JournalState) => state.createThreadForEntry);
    const setActiveThreadId = useJournalStore((state: JournalState) => state.setActiveThreadId);
    const getEntryById = useJournalStore((state: JournalState) => state.getEntryById);

    const [input, setInput] = useState('');
    const [threadId, setThreadId] = useState<string>(GLOBAL_THREAD_ID);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { sendMessageToAI } = useAI(); // ✅ Use AI context

    useEffect(() => {
        if (!entryId) {
            setThreadId(GLOBAL_THREAD_ID);
            setActiveThreadId(GLOBAL_THREAD_ID);
            return;
        }

        const entry = getEntryById(entryId);
        if (entry) {
            if (entry.chatId) {
                setThreadId(entry.chatId);
                setActiveThreadId(entry.chatId);
            } else {
                const newThreadId = createThreadForEntry(entryId);
                setThreadId(newThreadId);
                setActiveThreadId(newThreadId);
            }
        }
    }, [entryId, getEntryById, createThreadForEntry, setActiveThreadId]);

    const messages = useJournalStore(
        useShallow((state: JournalState) => state.messages.filter((m) => m.threadId === threadId))
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userText = input;
        setInput('');

        // Use AIContext to send message and handle streaming
        await sendMessageToAI(userText, threadId, {
            targetType: 'journal',
            entryId,
        });
    };

    const entry = entryId ? getEntryById(entryId) : undefined;
    const debouncedContent = useDebounce(entry?.content || '', 2000);
    const addMessage = useJournalStore((state) => state.addMessage);

    // Add realtime reflection to chat when entry content changes, only if meaningfully different
    useEffect(() => {
        if (!hasStartedEditing) return;
        const trimmed = debouncedContent.trim();
        // Only trigger on sentence-ending punctuation
        const endsWithSentence = /[.!?]$/.test(trimmed);
        if (!entryId || !trimmed || trimmed.length < 30 || !endsWithSentence) return;
        let cancelled = false;
        const addReflection = async () => {
            const threadMessages = useJournalStore.getState().messages.filter((m) => m.threadId === threadId);
            const lastReflection = [...threadMessages].reverse().find((m) => m.isRealtimeReflection);

            // Determine what to reflect on
            let reflectionTarget = trimmed;
            if (lastReflection || trimmed.length > 1200) {
                // If already reflected or entry is long, use last 3 sentences or last 400 chars minimum
                const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [];
                const lastSentences = sentences.slice(-3).join('').trim();
                // Fallback: if lastSentences is too short, use last 400 chars
                reflectionTarget = lastSentences.length > 80 ? lastSentences : trimmed.slice(-400);
            }

            if (lastReflection) {
                // Use embeddings to check semantic similarity
                const lastReflectedContent = lastReflection.reflectedContent || '';
                console.log('[Echo Reflection] Comparing last reflected content and new content:');
                console.log('Last reflected content:', lastReflectedContent);
                console.log('New reflection target:', reflectionTarget);
                const sim = await getEmbeddingSimilarity(lastReflectedContent, reflectionTarget);
                console.log('[Echo Reflection] Similarity score:', sim, '| Target length:', reflectionTarget.length);
                if (sim > REFLECTION_SIMILARITY_THRESHOLD || reflectionTarget.length < 30) return; // Too similar or not enough new content
            }
            // Streaming version
            let reflectionText = '';
            let addedMessageId: string | null = null;
            try {
                const stream = streamRealtimeReflection(reflectionTarget, entryId);
                for await (const { token } of stream) {
                    if (cancelled) break;
                    if (!addedMessageId) {
                        // Add the message on first token
                        addedMessageId = addMessage('ai', '', threadId, entryId, true, reflectionTarget);
                    }
                    reflectionText += token;
                    // Update the message in the store as tokens stream in
                    useJournalStore.getState().updateMessageById(addedMessageId, reflectionText);
                }
            } catch (err) {
                console.error('Error streaming realtime reflection:', err);
            }
            // Final update (in case)
            if (!cancelled && reflectionText.trim() && addedMessageId) {
                useJournalStore.getState().updateMessageById(addedMessageId, reflectionText);
            }
        };
        addReflection();
        return () => {
            cancelled = true;
        };
    }, [debouncedContent, entryId, threadId, addMessage, hasStartedEditing]);

    return (
        <div className="flex flex-col h-full bg-muted/10 border-l border-border/60 md:border-l-0 md:border-t md:border-t border-border/60 rounded-b-xl md:rounded-b-none md:rounded-r-xl shadow-sm">
            {/* Chat Header */}
            <div className="flex items-center justify-start gap-2 px-4 pt-4 pb-2 border-b border-border/60 bg-background/80 rounded-t-xl">
                <span className="h-2 w-2 rounded-full bg-primary/70 group-hover:bg-primary transition-colors" />
                <h3 className="text-lg font-semibold text-primary-900 tracking-tight">Echo Chat</h3>
            </div>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 flex flex-col">
                {messages.map((m) => {
                    const key = `${m.messageId}-${m.sender}`;
                    if (m.sender === 'user') {
                        return (
                            <div key={key} className="flex w-full justify-end">
                                <ChatBubble message={m} />
                            </div>
                        );
                    } else {
                        const hasCitations = m.text.includes('[Entry ID:');
                        const content = hasCitations ? (
                            <div>{parseReflectionWithCitations(m.text)}</div>
                        ) : undefined;
                        return (
                            <div key={key} className="flex w-full justify-start">
                                <ChatBubble message={{ ...m, text: hasCitations ? '' : m.text }}>
                                    {content}
                                </ChatBubble>
                            </div>
                        );
                    }
                })}
                <div ref={messagesEndRef} />
            </div>
            {/* Chat Input */}
            <div className="p-3 border-t border-border/60 bg-background/90 rounded-b-xl">
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    placeholder="Chat with Echo..."
                />
            </div>
        </div>
    );
};

export default ChatPanel;
