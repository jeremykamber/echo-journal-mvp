import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { JournalEntry } from '@/store/journalStore';
import DeleteEntryButton from '@/components/DeleteEntryButton'; // Import the delete button
import { formatDate, cn } from '@/lib/utils'; // Import cn

interface JournalEntryCardProps {
  entry: JournalEntry;
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry }) => {
  // Format the entry date for display
  const displayDate = formatDate(entry.date);

  // Truncate content for preview
  const contentPreview = entry.content.length > 120
    ? `${entry.content.slice(0, 120)}...`
    : entry.content;

  return (
    <Card className="group relative bg-card border border-primary/20 hover:border-primary/0 rounded-xl shadow-lg hover:shadow-xl dark:shadow-primary/5 transition-all duration-300">
      {/* Delete button positioned absolutely, appears on hover */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DeleteEntryButton entryId={entry.id} />
      </div>
      <Link to={`/entry/${entry.id}`} className="block px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-primary/70 group-hover:bg-primary transition-colors" />
          <h2 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
            {entry.title}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{displayDate}</p>
        <p className="text-sm text-muted-foreground/90 line-clamp-2">{contentPreview}</p>
      </Link>
    </Card>
  );
};

export default JournalEntryCard;
