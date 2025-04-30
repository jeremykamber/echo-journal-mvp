// filepath: src/services/entryService.ts
// Service for CRUD operations on journal entries and reflections
import { JournalEntry } from '@/store/journalStore';

// Persist a new or updated entry (stub; integrate with your database)
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
    // TODO: replace with real DB write
    console.log('Saving entry', entry.id);
}

// Retrieve an entry by ID
export async function loadJournalEntry(id: string): Promise<JournalEntry | undefined> {
    // TODO: replace with real DB read
    console.log('Loading entry', id);
    return undefined;
}

// Persist a reflection for an entry
export async function saveReflection(entryId: string, reflection: string): Promise<void> {
    // TODO: replace with real DB write
    console.log('Saving reflection for entry', entryId, reflection);
}
