import React from 'react';
import useJournalStore from '@/store/journalStore';
import JournalEntryCard from '@/components/JournalEntryCard';
import AppHeader from '../components/AppHeader';

export const Entries: React.FC = () => {
  const entries = useJournalStore((state) => state.entries);

  return (
    <>
      <AppHeader center={<span className="text-2xl font-bold">All Journal Entries</span>} />
      <div className="px-4 py-8 max-w-5xl mx-auto w-full">
        {entries.length === 0 ? (
          <div className="text-muted-foreground text-center py-12 text-lg">No journal entries yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {entries
              .slice()
              .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
              .map((entry) => (
                <JournalEntryCard key={entry.id} entry={entry} />
              ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Entries;
