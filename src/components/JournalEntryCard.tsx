import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { JournalEntry } from '@/store/journalStore';
import DeleteEntryButton from '@/components/DeleteEntryButton'; // Import the delete button
import { formatDate } from '@/lib/utils'; // Import cn

interface JournalEntryCardProps {
  entry: JournalEntry;
  matchScore?: number;
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry, matchScore }) => {
  // Format the entry date for display
  const displayDate = formatDate(entry.date);

  // Map similarity score to resonance label and strength
  // Larger score = higher resonance. Assume cosine similarity (0 to 1)
  const getResonanceInfo = (score: number) => {
    // If score looks like distance (near 0 is better), we might need to invert it.
    // However, similaritySearchWithScore usually returns similarity in most JS libs (cosine distance = 1 - sim).
    // Let's assume higher is better (similarity).
    if (score > 0.85) return { label: 'Profound', color: 'text-indigo-600 dark:text-indigo-400', barBg: 'bg-indigo-500', width: 'w-full' };
    if (score > 0.7) return { label: 'Strong', color: 'text-blue-600 dark:text-blue-400', barBg: 'bg-blue-500', width: 'w-3/4' };
    if (score > 0.5) return { label: 'Clear', color: 'text-sky-600 dark:text-sky-400', barBg: 'bg-sky-500', width: 'w-1/2' };
    return { label: 'Relevant', color: 'text-slate-500', barBg: 'bg-slate-400', width: 'w-1/4' };
  };

  const resonance = matchScore !== undefined ? getResonanceInfo(matchScore) : null;

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
        <div className="flex justify-start items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-primary/70 group-hover:bg-primary transition-colors" />
          <h2 className="w-[80%] text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
            {entry.title}
          </h2>
        </div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs text-muted-foreground">{displayDate}</p>
          {resonance && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/10">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${resonance.color}`}>
                {resonance.label} Resonance
              </span>
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden hidden sm:block">
                <div className={`h-full ${resonance.barBg} ${resonance.width}`} />
              </div>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground/90 line-clamp-2 mb-3">{contentPreview}</p>

        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {entry.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] bg-primary/10 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">
                #{tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>
    </Card>
  );
};

export default JournalEntryCard;
