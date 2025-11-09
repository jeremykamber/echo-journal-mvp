import React, { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Message as JournalMessage } from '@/store/journalStore';
import { Message as ConversationMessage } from '@/store/conversationStore';

import MarkdownWithCitations from '@/components/MarkdownWithCitations';
import ReflectionReaction from '@/components/ReflectionReaction';
import { StashButton } from '@/components/StashButton';
import { Button } from './ui/button';
import { useServices } from '@/providers/ServiceProvider';


// Create a union type to support both message types
type MessageType =
    | (JournalMessage & { isRealtimeReflection?: boolean })
    | (ConversationMessage & { conversationId: string; threadId?: string; isRealtimeReflection?: boolean }); // Add optional threadId to make it compatible

interface ChatBubbleProps {
    message: MessageType;
    children?: ReactNode;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, children }) => {
    const [copied, setCopied] = React.useState(false);
    const [copyFailed, setCopyFailed] = React.useState(false);
    const isAI = message.sender === 'ai';

    // Get userId for stashing (for now, fallback to 'local-user')
    // In a real app, replace with actual user auth context
    const userId = 'local-user';

    const { sessionService } = useServices();

    // Trigger reflection_viewed event when an AI message is displayed
    useEffect(() => {
        if (isAI) {
            try {
                const raw = sessionService.getItem('viewedMessages');
                const viewedMessages = raw ? JSON.parse(raw) : [];
                if (!viewedMessages.includes(message.messageId)) {
                    // Add to viewed messages
                    viewedMessages.push(message.messageId);
                    sessionService.setItem('viewedMessages', JSON.stringify(viewedMessages));

                    // Dispatch the event that the FeedbackNudge is listening for
                    const viewEvent = new CustomEvent('reflection_viewed', {
                        detail: { messageId: message.messageId }
                    });
                    document.dispatchEvent(viewEvent);
                }
            } catch (err) {
                // If parsing or storage fails, fail silently to avoid breaking render
                console.warn('Failed to mark message as viewed', err);
            }
        }
    }, [isAI, message.messageId, sessionService]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.text);
            setCopied(true);
            setCopyFailed(false);
            setTimeout(() => setCopied(false), 1200);
        } catch (e) {
            console.error('Failed to copy text: ', e);
            setCopyFailed(true);
            setTimeout(() => setCopyFailed(false), 1200);
        }
    };

    return (
        <div
            className={cn(
                'group p-4 rounded-lg whitespace-pre-line relative', // Added 'relative' for positioning
                'text-sm shadow-md',
                isAI
                    ? 'text-muted-foreground self-start shadow-primary-foreground/30 max-w-full'
                    : 'bg-primary text-primary-foreground self-end shadow-primary/30 max-w-md',
                message.isRealtimeReflection && 'border-2 border-primary/60 bg-primary/5 relative'
            )}
        >
            {message.isRealtimeReflection && (
                <div className="flex items-center gap-1 mb-2 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wider">Echo's Reflection</span>
                </div>
            )}
            <div className="prose prose-sm">
                <MarkdownWithCitations>{message.text}</MarkdownWithCitations>
            </div>
            {isAI && !!message.text && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Button
                        variant={'ghost'}
                        onClick={handleCopy}
                        className={cn(
                            '',
                            copied
                                ? 'text-primary hover:text-primary border-primary bg-background'
                                : copyFailed
                                    ? 'text-red-600 border-red-600 bg-red-100'
                                    : ''
                        )}
                        title="Copy AI output"
                    >
                        {copied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                            </>
                        ) : copyFailed ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Failed!
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <rect x="3" y="3" width="13" height="13" rx="2" />
                                </svg>
                                Copy
                            </>
                        )}
                    </Button>
                    <ReflectionReaction
                        reflectionText={message.text}
                        source={message.threadId?.startsWith('conversation') ? 'Conversation' : 'Journal'}
                        isRealtimeReflection={message.isRealtimeReflection}
                    />
                </div>
            )}
            {/* Stash button in the bottom-right corner */}
            {isAI && !!message.text && (
                <div className="absolute bottom-2 right-2">
                    <StashButton
                        reflectionText={message.text}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        sourceType={('conversationId' in message && (message as any).conversationId) ? 'conversation' : 'journal'}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        sourceId={('conversationId' in message && (message as any).conversationId)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ? (message as any).conversationId
                            : (message.entryId || '')}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        sourceTitleOrDate={('conversationId' in message && (message as any).conversationId)
                            ? (message.timestamp ? new Date(message.timestamp).toLocaleDateString() : '')
                            : (message.entryId || '')}
                        createdAt={message.timestamp}
                        userId={userId}
                    />
                </div>
            )}
            {children && <div className="mt-3 pt-3 border-t border-secondary/30">{children}</div>}
        </div>
    );
}
