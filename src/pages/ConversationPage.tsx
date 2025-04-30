import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useConversationStore from '@/store/conversationStore';
import { Message, Conversation } from '@/store/conversationStore';
import { ChatBubble } from '@/components/ChatBubble';
import { parseReflectionWithCitations } from '@/lib/parseReflectionWithCitations';
import { ChevronLeft, Edit, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/shallow';
import { ChatInput } from '@/components/ChatInput';
import { useAI } from '@/context/AIContext';


const ConversationPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState('');
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const setActiveConversationId = useConversationStore((state) => state.setActiveConversationId);
    const getConversationById = useConversationStore((state) => state.getConversationById);
    const updateConversationTitle = useConversationStore((state) => state.updateConversationTitle);

    const conversation: Conversation | undefined = id ? getConversationById(id) : undefined;
    const messages = useConversationStore(useShallow((state) => state.messages.filter((m) => m.conversationId === id)));
    console.log(`Messages for conversation ${id}:`, messages);

    const { sendMessageToAI } = useAI();

    const handleSendMessage = async () => {
        if (!id || !input.trim()) return;
        sendMessageToAI(input, id, {
            targetType: 'conversation',
        })
    };

    const initializeConversation = async () => {
        if (id) {
            setActiveConversationId(id);
            if (conversation) {
                setTitleValue(conversation.title);
            }
            return () => {
                setActiveConversationId(null);
            };
        }
    };

    useEffect(() => console.log(messages), [messages]);

    useEffect(() => {
        initializeConversation();
    }, [id]);

    // Auto-scroll to bottom when messages change, if autoScroll is enabled
    useEffect(() => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, autoScroll]);

    // Disable auto-scroll if user scrolls up
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            // If user is near the bottom, keep autoScroll enabled
            const threshold = 80; // px
            const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            setAutoScroll(atBottom);
        };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    if (!conversation || !id) {
        return <div className="p-4">Conversation not found.</div>;
    }

    const handleUpdateTitle = (newTitle: string) => {
        if (id) {
            updateConversationTitle(id, newTitle);
            setIsEditingTitle(false);
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <div className="border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors p-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Link>

                    {isEditingTitle ? (
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                className={cn(
                                    "text-lg font-medium w-full max-w-md",
                                    "focus:outline-none focus:ring-0",
                                    "bg-transparent placeholder:text-muted-foreground/50"
                                )}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleUpdateTitle(titleValue);
                                    } else if (e.key === 'Escape') {
                                        setTitleValue(conversation.title);
                                        setIsEditingTitle(false);
                                    }
                                }}
                                placeholder="Conversation Title"
                            />
                            <button
                                onClick={() => handleUpdateTitle(titleValue)}
                                className="p-2 text-primary hover:text-primary/80 transition-colors"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <h1 className="text-lg font-medium">{conversation.title}</h1>
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="p-2 text-muted-foreground/50 hover:text-primary transition-colors"
                            >
                                <Edit className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="text-xs text-muted-foreground">
                    {new Date(conversation.date).toLocaleDateString()}
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 py-2 space-y-2 flex flex-col"
            >
                {messages.map((m: Message) => {
                    if (m.sender === 'user') {
                        return (
                            <div key={`${m.messageId}-user`}>
                                <ChatBubble message={m} />
                            </div>
                        );
                    } else {
                        return (
                            <div key={`${m.messageId}-ai`}>
                                <ChatBubble message={m} />
                            </div>
                        );
                    }
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border">
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSendMessage}
                    disabled={false}
                    placeholder="Continue the conversation..."
                />
            </div>
        </div>
    );
};

export default ConversationPage;
