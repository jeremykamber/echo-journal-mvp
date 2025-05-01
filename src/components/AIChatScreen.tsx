import React, { useState, useEffect } from 'react';
import AppHeader from './AppHeader';
import { useNavigate, useParams } from 'react-router-dom';
import useJournalStore from '@/store/journalStore';
import useConversationStore from '@/store/conversationStore';
import JournalEntryCard from '@/components/JournalEntryCard';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { useAI } from '@/context/AIContext';
import { cn } from '@/lib/utils';
import EyebrowTextPill from '@/components/EyebrowTextPill';
import { Button } from '@/components/ui/button';
import DeleteConversationButton from '@/components/DeleteConversationButton';
import { PlusIcon, Pencil as PencilIcon, Check as CheckIcon, X as XIcon } from 'lucide-react';
// import PromptBar from '@/components/PromptBar';
import ImportButton from '@/components/ImportButton';
import { SidebarTrigger } from './ui/sidebar';

const AIChatScreen: React.FC = () => {
    const navigate = useNavigate();
    const { id: routeConvId } = useParams<{ id: string }>();
    const entries = useJournalStore(state => state.entries);
    const createEntry = useJournalStore(state => state.createEntry);
    const createConversation = useConversationStore(state => state.createConversation);
    const deleteConversation = useConversationStore(state => state.deleteConversation);
    const getMessagesForConversation = useConversationStore(state => state.getMessagesForConversation);
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const { sendMessageToAI } = useAI();
    const [isLoaded, setIsLoaded] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);

    // Track if a conversation was created due to input
    const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);

    // If route has conv id, set it; if not, clear conversationId
    useEffect(() => {
        if (routeConvId) {
            setConversationId(routeConvId);
        } else {
            setConversationId(null);
        }
    }, [routeConvId]);

    // auto-switch when user types
    useEffect(() => {
        if (input.trim() && !conversationId) {
            const id = createConversation(null);
            setConversationId(id);
            setPendingConversationId(id);
            navigate(`/conversation/${id}`, { replace: true });
        }
    }, [input]);

    // If input is cleared and conversation is pending (no messages), delete it
    useEffect(() => {
        if (
            pendingConversationId &&
            (!input.trim() || !conversationId) &&
            getMessagesForConversation(pendingConversationId).length === 0
        ) {
            deleteConversation(pendingConversationId);
            setPendingConversationId(null);
            setConversationId(null);
        }
    }, [input, pendingConversationId, conversationId]);

    // Remove direct Zustand selector for messages
    const allMessages = useConversationStore(state => state.messages);
    const [messages, setMessages] = useState(() =>
        conversationId ? allMessages.filter(m => m.conversationId === conversationId) : []
    );
    useEffect(() => {
        setMessages(conversationId ? allMessages.filter(m => m.conversationId === conversationId) : []);
    }, [conversationId, allMessages]);

    // Conversation title editing state
    const getConversationById = useConversationStore(state => state.getConversationById);
    const updateConversationTitle = useConversationStore(state => state.updateConversationTitle);
    const conversation = conversationId ? getConversationById(conversationId) : undefined;
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(conversation?.title || '');

    // Keep titleValue in sync with store
    useEffect(() => {
        if (conversation) setTitleValue(conversation.title);
    }, [conversation?.id]);

    const handleSaveTitle = () => {
        if (conversationId && titleValue.trim()) {
            updateConversationTitle(conversationId, titleValue.trim());
            setIsEditingTitle(false);
        }
    };

    const handleCancelEdit = () => {
        setTitleValue(conversation?.title || '');
        setIsEditingTitle(false);
    };

    const isConversation = !!conversationId;

    // Home view fade-out logic
    const [showHome, setShowHome] = useState(!isConversation);
    const [homeFading, setHomeFading] = useState(false);

    // When isConversation changes, handle fade-out for home
    useEffect(() => {
        if (!isConversation) {
            setShowHome(true);
            setHomeFading(false);
        } else if (showHome) {
            setHomeFading(true);
            // Unmount home after fade-out duration
            const timeout = setTimeout(() => {
                setShowHome(false);
                setHomeFading(false);
            }, 300); // match duration-300
            return () => clearTimeout(timeout);
        }
    }, [isConversation]);

    // If a message is sent, clear pendingConversationId so it persists
    const handleSend = async () => {
        if (!input.trim() || !conversationId) return;
        await sendMessageToAI(input, conversationId, { targetType: 'conversation' });
        setInput('');
        setPendingConversationId(null);
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section
            id="home-section"
            className="relative flex flex-col min-h-screen bg-gradient-to-b from-primary-foreground/50 to-background overflow-hidden"
        >
            {/* Radial gradient background */}
            <div className="absolute inset-0 bg-gradient-radial from-primary-foreground/5 to-transparent opacity-70"></div>
            {/* Noise texture */}
            <div className="absolute inset-0 bg-noise opacity-20 mix-blend-soft-light"></div>
            {/* App Header with animation */}
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isConversation
                        ? "max-h-20 opacity-100"
                        : "max-h-0 opacity-0"
                )}
            >
                <AppHeader
                    center={
                        isConversation ? (
                            isEditingTitle ? (
                                <div className="flex items-center w-full max-w-[70vw]">
                                    <input
                                        type="text"
                                        value={titleValue}
                                        onChange={e => setTitleValue(e.target.value)}
                                        className={cn(
                                            "text-xl font-semibold w-full bg-transparent focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                                        )}
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveTitle();
                                            else if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                        placeholder="Conversation Title"
                                    />
                                    <button
                                        onClick={handleSaveTitle}
                                        className={cn(
                                            "p-2 ml-2 text-primary hover:text-primary/80 rounded-full hover:bg-primary/10 transition-colors"
                                        )}
                                        title="Save title"
                                    >
                                        <CheckIcon size={18} />
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className={cn(
                                            "p-2 ml-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                                        )}
                                        title="Cancel"
                                    >
                                        <XIcon size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center w-full max-w-[70vw]">
                                    <span className="text-xl font-semibold truncate flex-1">{conversation?.title}</span>
                                    <button
                                        onClick={() => setIsEditingTitle(true)}
                                        className={cn(
                                            "p-2 ml-2 text-muted-foreground hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                                        )}
                                        title="Edit title"
                                    >
                                        <PencilIcon size={16} />
                                    </button>
                                </div>
                            )
                        ) : null
                    }
                    right={
                        isConversation ? (
                            <DeleteConversationButton conversationId={conversationId!} onDelete={() => navigate('/')} />
                        ) : null
                    }
                />
            </div>
            <div className="relative flex flex-col flex-1">
                {/* Scrollable content area */}
                <div className="flex-1 overflow-auto relative">
                    {/* Only render one view at a time to prevent flicker */}
                    {showHome && (
                        <div
                            id="home-view"
                            className={cn(
                                'absolute inset-0 flex flex-col transition-opacity duration-300',
                                !isLoaded ? 'opacity-0' : homeFading ? 'opacity-0' : 'opacity-100'
                            )}
                        >
                            <SidebarTrigger className="md:hidden m-4" />
                            <div className="container flex flex-col items-center mx-auto relative z-10 flex-1 overflow-y-auto p-8">
                                <EyebrowTextPill
                                    isLoaded={isLoaded}
                                    text={new Date().toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                />
                                <h1
                                    className={cn(
                                        "text-4xl md:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-primary-900 max-w-4xl mx-auto text-center mb-18",
                                        "opacity-0",
                                        isLoaded && "opacity-100 animate-fade-in"
                                    )}
                                    style={{ animationDelay: '400ms' }}
                                >
                                    Welcome to
                                    <br />
                                    <span className="text-primary">Echo</span>
                                </h1>
                                <div className="w-full mb-8 flex flex-wrap justify-center gap-4">
                                    <Button
                                        onClick={() => {
                                            const newEntryId = createEntry();
                                            navigate(`/entry/${newEntryId}`);
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 text-md py-6 px-6 shadow-md",
                                            "bg-primary text-primary-foreground hover:bg-primary/90",
                                            "opacity-0 transform translate-y-4",
                                            isLoaded && "opacity-100 translate-y-0 transition-all duration-500 ease-out"
                                        )}
                                        style={{ animationDelay: '600ms' }}
                                    >
                                        <PlusIcon size={20} />
                                        New Journal Entry
                                    </Button>
                                    <ImportButton isLoaded={isLoaded} showImportDialog={showImportDialog} setShowImportDialog={setShowImportDialog} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {entries.slice(0, 3).map(entry => (
                                        <JournalEntryCard key={entry.id} entry={entry} />
                                    ))}
                                    {entries.length === 0 && (
                                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center text-muted-foreground p-8">
                                            <p>No journal entries yet. Create your first one!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {isConversation && (
                        <div
                            id="conversation-view"
                            className={cn(
                                'absolute inset-0 flex flex-col transition-opacity duration-300',
                                isConversation ? 'opacity-100 animate-fade-in' : 'opacity-0 pointer-events-none'
                            )}
                        >
                            <div className="flex flex-col items-end flex-1 overflow-auto p-4 space-y-3">
                                {/* Conversation title is now in header */}
                                {messages.map(m => (
                                    <ChatBubble key={m.messageId + m.sender} message={m} />
                                ))}
                                <div className="h-4" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating prompt/input bar at bottom */}
                <div
                    className="pointer-events-none absolute left-0 right-0 bottom-0 z-30 flex justify-center bg-transparent"
                    style={{ width: '100%' }}
                >
                    <div className="pointer-events-auto w-full max-w-2xl px-4 pb-6">
                        <ChatInput value={input} onChange={setInput} onSend={handleSend} placeholder='Explore your entries' />
                    </div>
                </div>
            </div> {/* close relative flex-1 */}
        </section>
    );
};

export default AIChatScreen;
