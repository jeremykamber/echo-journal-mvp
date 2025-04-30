// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/lib/parseReflectionWithCitations.tsx
import React from 'react';
import useJournalStore from '../store/journalStore';
import EyebrowCitation from '../components/EyebrowCitation';

/**
 * Parses text with citation markers and returns an array of React elements
 * with inline citation components
 * 
 * @param text The text to parse for citations [Entry ID: xyz]
 * @returns Array of React elements with text and citations
 */
export function parseReflectionWithCitations(text: string): React.ReactNode[] {
    if (!text) return [];

    // Update the regex to match the new citation format
    const segments = text.split(/(\[Entry ID=entry-[\w-]+\])/g);
    if (segments.length <= 1) {
        return [<React.Fragment key="single">{text}</React.Fragment>];
    }

    const elements: React.ReactNode[] = [];

    // Process segments in pairs: text followed by citation
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        // If this is a citation marker
        if (segment.match(/\[Entry ID=entry-[\w-]+\]/)) {
            const match = segment.match(/\[Entry ID=(entry-[\w-]+)\]/);
            if (match && match[1]) {
                const entryId = match[1];
                const entry = useJournalStore.getState().entries.find(e => e.id === entryId);

                if (entry) {
                    // Add the citation component inline
                    elements.push(<EyebrowCitation key={`citation-${i}`} entry={entry} />);
                }
            }
        } else {
            // This is regular text, add it
            if (segment.trim()) {
                elements.push(<React.Fragment key={`text-${i}`}>{segment}</React.Fragment>);
            }
        }
    }

    return elements;
}
