// filepath: src/components/EyebrowCitation.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { JournalEntry } from '@/store/journalStore';

interface EyebrowCitationProps {
    entry: JournalEntry;
}

const EyebrowCitation: React.FC<EyebrowCitationProps> = ({ entry }) => {
    return (
        <Link
            to={`/entry/${entry.id}`}
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                "bg-primary/10 text-primary hover:bg-primary/5",
                "text-xs font-medium no-underline transition-colors",
                "whitespace-nowrap max-w-[150px]",
                "border border-primary-foreground/10",
                "shadow-sm"
            )}
        >
            <svg
                className="w-3 h-3 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate">
                {entry.title || `Entry ${entry.id.substring(0, 4)}`}
            </span>
        </Link>
    );
};

export default EyebrowCitation;
