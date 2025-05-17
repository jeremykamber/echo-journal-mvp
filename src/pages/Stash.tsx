import React from 'react';
import { useStashStore } from '@/store/stashStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MarkdownWithCitations from '@/components/MarkdownWithCitations';
import useJournalStore from '@/store/journalStore';
import useConversationStore from '@/store/conversationStore';

export default function Stash() {
    const { items, removeFromStash } = useStashStore();
    // Import stores for lookup
    const journalEntries = useJournalStore((state: any) => state.entries);
    const conversations = useConversationStore((state: any) => state.conversations);
    const navigate = useNavigate();

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Your Stashed Reflections</h1>
            {items.length === 0 ? (
                <div className="text-muted-foreground">No reflections in your Stash yet.</div>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.stashItemId} className="bg-card rounded-lg shadow p-4 flex flex-col gap-2">
                            <MarkdownWithCitations>{item.reflectionText}</MarkdownWithCitations>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary">
                                    {item.sourceType === 'journal'
                                        ? (() => {
                                            const entry = journalEntries.find((e: any) => e.id === item.sourceId);
                                            return entry ? `From Journal: ${entry.title}` : 'From Journal';
                                        })()
                                        : (() => {
                                            const convo = conversations.find((c: any) => c.id === item.sourceId);
                                            return convo ? `From Conversation: ${convo.title}` : 'From Conversation';
                                        })()}
                                </Badge>
                                <span className="ml-2">Written: {new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        if (item.sourceType === 'journal') {
                                            // Only use the entry id up to the second dash (entry-1747103840640-qfzs7r8)
                                            let match = item.sourceId.match(/^(entry-[^-]+-[^-]+)/);
                                            let cleanId = match ? match[1] : item.sourceId;
                                            navigate(`/entry/${cleanId}`);
                                        } else {
                                            navigate(`/conversation/${item.sourceId}`);
                                        }
                                    }}
                                >
                                    View Source
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeFromStash(item.stashItemId)}
                                >
                                    Unstash
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
