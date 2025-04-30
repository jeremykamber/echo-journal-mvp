import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { JournalEntry } from '@/store/journalStore';

interface CitationCardProps {
    entry: JournalEntry;
}

const CitationCard: React.FC<CitationCardProps> = ({ entry }) => {
    const entryDate = entry.date ? new Date(entry.date).toLocaleDateString() : '';
    const previewText = entry.content
        ? entry.content.length > 70
            ? `${entry.content.substring(0, 70)}...`
            : entry.content
        : 'No content';

    return (
        <Link
            to={`/entry/${entry.id}`}
            className="block max-w-md w-full"
        >
            <div className={cn(
                "p-3 rounded-lg bg-card",
                "border border-border hover:border-primary/50",
                "shadow-sm hover:shadow-md transition-all"
            )}>
                <div className="flex gap-3">
                    <svg className="w-4 h-4 mt-1 text-primary/70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>

                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                            {entry.title || `Journal Entry ${entry.id.substring(0, 4)}`}
                        </div>

                        {entryDate && (
                            <div className="text-xs text-muted-foreground mb-1">
                                {entryDate}
                            </div>
                        )}

                        <div className="text-xs text-foreground/80 line-clamp-2">
                            {previewText}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default CitationCard;
