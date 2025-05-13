import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import AppHeader from '../components/AppHeader';
import { useParams } from 'react-router-dom';
import JournalEntryTour from '@/components/tours/JournalEntryTour';
import useJournalStore, { JournalState } from '@/store/journalStore';
import ChatPanel from '@/components/ChatPanel';
import { ChatInput } from '@/components/ChatInput'; // Import ChatInput
import FeatureTour from '@/components/onboarding/FeatureTour';
import { cn } from '@/lib/utils';
import { Pencil as PencilIcon, Check as CheckIcon, X as XIcon } from 'lucide-react';
import DeleteEntryButton from '@/components/DeleteEntryButton';
import { useAI } from '@/context/AIContext'; // Import useAI
import { Card, CardContent } from '@/components/ui/card';
import { ChatDrawer } from '@/components/ChatDrawer';


const GLOBAL_THREAD_ID = 'global-chat'; // Define global thread ID

const Entry: React.FC = () => {
    const { id } = useParams<{ id: string }>();


    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const entry = useJournalStore((state) => id ? state.getEntryById(id) : undefined);
    const updateEntry = useJournalStore((state) => state.updateEntry);
    const updateEntryTitle = useJournalStore((state) => state.updateEntryTitle);
    const createThreadForEntry = useJournalStore((state: JournalState) => state.createThreadForEntry);
    const setActiveThreadId = useJournalStore((state: JournalState) => state.setActiveThreadId);
    const getEntryById = useJournalStore((state: JournalState) => state.getEntryById); // Keep this if needed elsewhere

    const [hasStartedEditing, setHasStartedEditing] = useState(false);
    // Removed entryFocused state
    // Removed chatInputFocused state
    const [isChatExpanded, setIsChatExpanded] = useState(false); // New state for chat visibility
    const [chatInput, setChatInput] = useState(''); // State for chat input value
    const [threadId, setThreadId] = useState<string>(GLOBAL_THREAD_ID); // State for thread ID

    const isMobile = useIsMobile();

    // Feature tour steps for mobile drawer
    const drawerTourSteps = [
        {
            targetSelector: '.ai-reflection-button',
            title: 'Chat Drawer',
            description:
                'This button will pulse when a realtime reflection has been generated.\n\Tap on the drawer to expand it and chat with Echo, or view your realtime reflections.',
            position: 'top' as const,
        },
    ];
    const { sendMessageToAI } = useAI(); // Get send message function

    // State for title editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState('');

    // Effect to set threadId based on entry
    useEffect(() => {
        if (!id) {
            setThreadId(GLOBAL_THREAD_ID);
            setActiveThreadId(GLOBAL_THREAD_ID);
            return;
        }
        const currentEntry = getEntryById(id);
        if (currentEntry) {
            if (currentEntry.chatId) {
                setThreadId(currentEntry.chatId);
                setActiveThreadId(currentEntry.chatId);
            } else {
                const newThreadId = createThreadForEntry(id);
                setThreadId(newThreadId);
                setActiveThreadId(newThreadId);
            }
        }
    }, [id, getEntryById, createThreadForEntry, setActiveThreadId]);

    // Effect for title value
    useEffect(() => {
        if (entry) {
            setTitleValue(entry.title);
        }
    }, [entry?.id]);

    // Handle sending chat message
    const handleSend = async () => {
        if (!chatInput.trim()) return;
        const userText = chatInput;
        setChatInput('');
        if (entry && entry.content.length > 0) {
            setErrorMessage(null);
            await sendMessageToAI(userText, threadId, {
                targetType: 'journal',
                entryId: id,
            });
        } else {
            setErrorMessage("Please write a journal entry before chatting.");
        }
    };

    if (!entry || !id) {
        return <div className="p-4">Entry not found.</div>;
    }

    return (
        <>
            {/* Mobile-only: Show feature tour for chat drawer */}
            {isMobile && entry && (
                <FeatureTour
                    tourId="mobile-drawer"
                    steps={drawerTourSteps}
                    autoStart={true}
                />
            )}
            {/* Main journal entry layout */}
            <div className="flex flex-col h-screen">
                <AppHeader
                    center={
                        isEditingTitle ? (
                            <div className="flex items-center w-full">
                                <input
                                    type="text"
                                    value={titleValue}
                                    onChange={e => setTitleValue(e.target.value)}
                                    className={cn(
                                        "text-2xl font-semibold w-full bg-transparent focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                                    )}
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            if (id && titleValue.trim()) {
                                                updateEntryTitle(id, titleValue.trim());
                                                setIsEditingTitle(false);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setTitleValue(entry.title);
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    placeholder="Entry Title"
                                />
                                <button
                                    onClick={() => {
                                        if (id && titleValue.trim()) {
                                            updateEntryTitle(id, titleValue.trim());
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    className={cn(
                                        "p-2 ml-2 text-primary hover:text-primary/80 rounded-full hover:bg-primary/10 transition-colors"
                                    )}
                                    title="Save title"
                                >
                                    <CheckIcon size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        setTitleValue(entry.title);
                                        setIsEditingTitle(false);
                                    }}
                                    className={cn(
                                        "p-2 ml-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                                    )}
                                    title="Cancel"
                                >
                                    <XIcon size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center w-full justify-between">
                                <h2 className="text-2xl font-semibold truncate flex-1">{entry.title}</h2>
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
                    }
                    right={<DeleteEntryButton entryId={id} redirectToHome={true} />}
                />
                {/* Main content area: flex-1 to take remaining space, min-h-0 for flex child */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    {/* Journal Area: flex-1, overflow */}
                    <div className="flex-1 min-w-0 overflow-y-auto bg-background flex flex-col">
                        <div className="flex flex-col flex-1 min-h-0">
                            <textarea
                                // Added entry-editor class for feature tour target
                                className={cn(
                                    "entry-editor w-full h-full px-4 pt-5 bg-transparent text-base resize-none flex-1 min-h-0 transition-all duration-300",
                                    "focus:outline-none",
                                    "placeholder:text-muted-foreground/50",
                                    // Add padding-bottom on mobile when chat is NOT expanded to make space for fixed input
                                    isMobile && !isChatExpanded && "pb-20" // Adjust value as needed
                                )}
                                value={entry.content}
                                onChange={(e) => {
                                    updateEntry(entry.id, e.target.value);
                                    if (!hasStartedEditing && e.target.value !== entry.content) {
                                        setHasStartedEditing(true);
                                    }
                                }}
                                placeholder="Write your entry here..."
                                style={{ minHeight: 0 }}
                                onFocus={() => setIsChatExpanded(false)} // Minimize chat on journal focus
                            />
                            {isMobile && <ChatDrawer
                                entryId={entry.id}
                                hasStartedEditing={hasStartedEditing}
                                threadId={threadId}
                                inputValue={chatInput}
                                setInputValue={setChatInput}
                                onSend={handleSend}
                                inputPlaceholder="Chat with Echo..."
                            />}
                        </div>
                    </div>

                    {/* Chat Container (Mobile: fixed bottom, Desktop: flex item) */}
                    <div
                        className={cn(
                            "chat-panel",
                            "md:border-l border-border",
                            "md:relative md:w-[40%] md:flex md:flex-col md:h-full md:shrink-0", // Desktop styles
                            isMobile ? "fixed bottom-0 left-0 right-0 z-10 flex flex-col" : "", // Mobile styles: fixed, flex-col
                            isChatExpanded ? "bg-background h-[70vh]" : "", // Gradient background
                            isMobile && "mb-[-20px] pb-[20px]", // Extend gradient past the input area on mobile by using negative margin
                        )}
                    >
                        {/* Chat Panel Content (Mobile: Conditional display/height/background) */}
                        <div className={cn(
                            "flex flex-5 flex-col flex overflow-hidden transition-all duration-300 ease-in-out mx-6",
                            // Mobile specific styles
                            isMobile && !isChatExpanded && "hidden", // Use hidden to remove from layout
                            isMobile && isChatExpanded && "h-[60vh] bg-background mx-6", // Set height and solid background when expanded
                            // Desktop styles
                            !isMobile && "h-full" // Desktop: always full height within container
                        )}>
                            <ChatPanel
                                entryId={entry.id}
                                hasStartedEditing={hasStartedEditing}
                                threadId={threadId} // Pass threadId
                            />

                            {/* Error Message Card */}
                            {errorMessage && (
                                <div className="px-3 mb-4">
                                    <Card className="bg-destructive/10 border-destructive/50">
                                        <CardContent className="text-destructive text-sm">
                                            {errorMessage}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                        </div>

                        {/* Chat Input Wrapper (Handles padding and background) */}
                        {!isMobile && (
                            <div
                                className={cn(
                                    "flex-shrink-0",
                                    isChatExpanded ? "mb-8 mx-3" : "pb-8 px-3",
                                )}
                            >
                                <ChatInput
                                    value={chatInput}
                                    onChange={setChatInput}
                                    onSend={handleSend}
                                    placeholder="Chat with Echo..."
                                    // Removed onBlur handler for chatInputFocused
                                    isExpanded={isChatExpanded} // Pass expanded state
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Post-onboarding journal entry tour */}
            <JournalEntryTour />
        </>
    );
};

export default Entry;
