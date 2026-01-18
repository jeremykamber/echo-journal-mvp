import React, { useState, useEffect, useMemo } from 'react';
import useJournalStore from '@/store/journalStore';
import JournalEntryCard from '@/components/JournalEntryCard';
import { Input } from '@/components/ui/input';
import { Search, BrainCircuit } from 'lucide-react';
import { similaritySearchWithScore } from '@/services/persistentVectorStore';
import { Document } from 'langchain/document';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useSearchParams } from 'react-router-dom';

export const Entries: React.FC = () => {
  const entries = useJournalStore((state) => state.entries);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [isSemantic, setIsSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<Record<string, number> | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced semantic search
  useEffect(() => {
    if (!isSemantic || !searchQuery.trim()) {
      setSemanticResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await similaritySearchWithScore(searchQuery, 20);
        const scores: Record<string, number> = {};

        results.forEach(([doc, score]: [Document, number]) => {
          if (doc.metadata.source === 'journal') {
            const entryId = doc.metadata.entryId;
            // Higher score = better match (Similarity)
            if (scores[entryId] === undefined || score > scores[entryId]) {
              scores[entryId] = score;
            }
          }
        });

        setSemanticResults(scores);
      } catch (err) {
        console.error('Semantic search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, isSemantic]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;

    if (isSemantic) {
      if (semanticResults === null) return entries; // Still waiting for results
      return entries
        .filter(e => semanticResults[e.id] !== undefined)
        .sort((a, b) => (semanticResults[b.id] || 0) - (semanticResults[a.id] || 0)); // Sort by similarity (desc)
    } else {
      // Basic keyword search
      const q = searchQuery.toLowerCase();
      return entries.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
  }, [entries, searchQuery, isSemantic, semanticResults]);

  return (
    <div className="px-4 py-8 mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your journal..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              setSearchParams(val ? { search: val } : {});
            }}
          />
        </div>

        <div className="flex items-center space-x-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
          <BrainCircuit className={`h-4 w-4 ${isSemantic ? 'text-primary' : 'text-muted-foreground'}`} />
          <Switch
            id="semantic-mode"
            checked={isSemantic}
            onCheckedChange={setIsSemantic}
          />
          <Label htmlFor="semantic-mode" className="cursor-pointer font-medium">
            Semantic Search
          </Label>
        </div>
      </div>

      {isSearching && (
        <div className="text-center py-4 text-muted-foreground animate-pulse">
          Searching your thoughts...
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <div className="text-muted-foreground text-center py-12 text-lg">
          {searchQuery ? "No matches found for your search." : "No journal entries yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredEntries
            .slice()
            .map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                matchScore={isSemantic ? semanticResults?.[entry.id] : undefined}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default Entries;
