import React, { useRef, useEffect } from 'react';
import useJournalStore, { JournalState } from '@/store/journalStore';
import { ChatBubble } from '@/components/ChatBubble';
import { parseReflectionWithCitations } from '@/lib/parseReflectionWithCitations';
import { useShallow } from 'zustand/shallow';
import { streamRealtimeReflection } from '@/services/aiService';
import { useDebounce } from '@/hooks/useDebounce';
import { getEmbeddingSimilarity } from '@/services/llmService';
import { useSettingsStore } from '@/store/settingsStore'; // Import settings store

interface ChatPanelProps {
    entryId?: string;
    hasStartedEditing?: boolean;
    threadId: string;
    isVisible?: boolean; // New prop to control visibility
}

const ChatPanel: React.FC<ChatPanelProps> = ({ entryId, hasStartedEditing, threadId, isVisible = true }) => {
    const getEntryById = useJournalStore((state: JournalState) => state.getEntryById);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const addMessage = useJournalStore((state) => state.addMessage);

    const messages = useJournalStore(
        useShallow((state: JournalState) => state.messages.filter((m) => m.threadId === threadId))
    );

    const reflectionSimilarityThreshold = useSettingsStore((state) => state.reflectionSimilarityThreshold); // Use setting
    const reflectionMinLength = useSettingsStore((state) => state.reflectionMinLength); // Use setting

    // Mark all messages in this thread as read when the panel is rendered
    const markAllMessagesAsReadInThread = useJournalStore((state) => state.markAllMessagesAsReadInThread);

    useEffect(() => {
        // Only mark as read when the panel is actually visible
        if (isVisible) {
            markAllMessagesAsReadInThread(threadId, { sender: 'ai' });
        }
    }, [threadId, isVisible]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const entry = entryId ? getEntryById(entryId) : undefined;
    const debouncedContent = useDebounce(entry?.content || '', 2000);

    useEffect(() => {
        if (!hasStartedEditing) return;
        const trimmed = debouncedContent.trim();
        const endsWithSentence = /[.!?]$/.test(trimmed);
        if (!entryId || !trimmed || trimmed.length < reflectionMinLength || !endsWithSentence) return; // Use setting
        let cancelled = false;
        const addReflection = async () => {
            const threadMessages = useJournalStore.getState().messages.filter((m) => m.threadId === threadId);
            const lastReflection = [...threadMessages].reverse().find((m) => m.isRealtimeReflection);

            let reflectionTarget = trimmed;
            if (lastReflection || trimmed.length > 1200) {
                const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [];
                const lastSentences = sentences.slice(-3).join('').trim();
                reflectionTarget = lastSentences.length > 80 ? lastSentences : trimmed.slice(-400);
            }

            if (lastReflection) {
                const lastReflectedContent = lastReflection.reflectedContent || '';
                const sim = await getEmbeddingSimilarity(lastReflectedContent, reflectionTarget);
                if (sim > reflectionSimilarityThreshold || reflectionTarget.length < reflectionMinLength) return; // Use settings
            }

            let reflectionText = '';
            let addedMessageId: string | null = null;
            try {
                const stream = streamRealtimeReflection(reflectionTarget, entryId);
                for await (const { token } of stream) {
                    if (cancelled) break;
                    if (!addedMessageId) {
                        addedMessageId = addMessage('ai', '', threadId, entryId, true, reflectionTarget);
                    }
                    reflectionText += token;
                    useJournalStore.getState().updateMessageById(addedMessageId, reflectionText);
                }
            } catch (err) {
                console.error('Error streaming realtime reflection:', err);
            }
            if (!cancelled && reflectionText.trim() && addedMessageId) {
                useJournalStore.getState().updateMessageById(addedMessageId, reflectionText);
            }
        };
        addReflection();
        return () => {
            cancelled = true;
        };
    }, [debouncedContent, entryId, threadId, addMessage, hasStartedEditing, reflectionSimilarityThreshold, reflectionMinLength]);



    return (
        <>
            <div className="flex items-center justify-start gap-2 px-4 pt-4 pb-2 border-b border-border/60 bg-background/80 rounded-t-xl flex-shrink-0">
                <span className="h-2 w-2 rounded-full bg-primary/70 group-hover:bg-primary transition-colors" />
                <h3 className="text-lg font-semibold text-primary-900 tracking-tight">Echo Chat</h3>
            </div>
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
