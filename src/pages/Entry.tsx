import React, { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { useParams, Link } from 'react-router-dom';
import useJournalStore from '@/store/journalStore';
import ChatPanel from '@/components/ChatPanel';
import { cn } from '@/lib/utils';
import { Pencil as PencilIcon, Check as CheckIcon, X as XIcon } from 'lucide-react';
import DeleteEntryButton from '@/components/DeleteEntryButton';

const Entry: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const entry = useJournalStore((state) => id ? state.getEntryById(id) : undefined);
    const updateEntry = useJournalStore((state) => state.updateEntry);
    const updateEntryTitle = useJournalStore((state) => state.updateEntryTitle);
    const [hasStartedEditing, setHasStartedEditing] = useState(false);

    // State for title editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState('');

    // Store initial content when component mounts
    useEffect(() => {
        if (entry) {
            setTitleValue(entry.title);
        }
    }, [entry?.id]); // Only reset when entry ID changes

    if (!entry || !id) {
        return <div className="p-4">Entry not found.</div>;
    }
    return (
        <>
            <AppHeader
                left={
                    <Link
                        to="/entries"
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors p-2 -ml-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        Back to Entries
                    </Link>
                }
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
            <div className="flex flex-col h-screen md:flex-row">
                {/* Main Entry Area */}
                <div className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto bg-background flex flex-col">
                    <div className="flex flex-col flex-1 min-h-0 space-y-4">
                        {/* Minimal Text Box */}
                        <textarea
                            value={entry.content}
                            onChange={(e) => {
                                updateEntry(entry.id, e.target.value);
                                if (!hasStartedEditing && e.target.value !== entry.content) {
                                    setHasStartedEditing(true);
                                }
                            }}
                            className={cn(
                                "w-full h-full bg-transparent text-base resize-none flex-1 min-h-0",
                                "focus:outline-none",
                                "placeholder:text-muted-foreground/50"
                            )}
                            placeholder="Write your entry here..."
                            style={{ minHeight: 0 }}
                        />
                        {/* RealtimeReflection removed: now handled in chat */}
                    </div>
                </div>
                {/* Chat Panel */}
                <div
                    className="w-full md:w-[350px] md:max-w-sm border-t md:border-t-0 md:border-l border-border bg-muted/10 flex flex-col h-[400px] md:h-full shrink-0"
                >
                    <ChatPanel entryId={entry.id} hasStartedEditing={hasStartedEditing} />
                </div>
            </div>
        </>
    );
};

export default Entry;
