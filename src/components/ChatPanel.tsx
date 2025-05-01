import React, { useRef, useEffect } from 'react';
import useJournalStore, { JournalState } from '@/store/journalStore';
import { ChatBubble } from '@/components/ChatBubble';
import { parseReflectionWithCitations } from '@/lib/parseReflectionWithCitations';
import { useShallow } from 'zustand/shallow';
import { streamRealtimeReflection } from '@/services/aiService';
import { useDebounce } from '@/hooks/useDebounce';
import { getEmbeddingSimilarity } from '@/services/llmService';

interface ChatPanelProps {
    entryId?: string;
    hasStartedEditing?: boolean;
    threadId: string; // Pass threadId as prop now
}

const REFLECTION_SIMILARITY_THRESHOLD = 0.90;

const ChatPanel: React.FC<ChatPanelProps> = ({ entryId, hasStartedEditing, threadId }) => {
    const getEntryById = useJournalStore((state: JournalState) => state.getEntryById);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const addMessage = useJournalStore((state) => state.addMessage); // Keep for reflection

    const messages = useJournalStore(
        useShallow((state: JournalState) => state.messages.filter((m) => m.threadId === threadId))
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const entry = entryId ? getEntryById(entryId) : undefined;
    const debouncedContent = useDebounce(entry?.content || '', 2000);

    // Realtime reflection logic remains largely the same, but uses the passed threadId
    useEffect(() => {
        if (!hasStartedEditing) return;
        const trimmed = debouncedContent.trim();
        // Only trigger on sentence-ending punctuation
        const endsWithSentence = /[.!?]$/.test(trimmed);
        if (!entryId || !trimmed || trimmed.length < 30 || !endsWithSentence) return;
        let cancelled = false;
        const addReflection = async () => {
            const threadMessages = useJournalStore.getState().messages.filter((m) => m.threadId === threadId); // Use passed threadId
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
                const sim = await getEmbeddingSimilarity(lastReflectedContent, reflectionTarget);
                if (sim > REFLECTION_SIMILARITY_THRESHOLD || reflectionTarget.length < 30) return;
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
                        addedMessageId = addMessage('ai', '', threadId, entryId, true, reflectionTarget); // Use passed threadId
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
    }, [debouncedContent, entryId, threadId, addMessage, hasStartedEditing]); // Use passed threadId

    return (
        <>
            {/* Chat Header */}
            <div className="flex items-center justify-start gap-2 px-4 pt-4 pb-2 border-b border-border/60 bg-background/80 rounded-t-xl flex-shrink-0">
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
        </>
    );
};

export default ChatPanel;
