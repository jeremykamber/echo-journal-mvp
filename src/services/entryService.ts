// filepath: src/services/entryService.ts
// Service for CRUD operations on journal entries and reflections
import { JournalEntry } from '@/store/journalStore';
import { autoSaveJournalEntry, autoSaveReflection } from '@/services/memoryAutoSave';
import { getNudgeService } from '@/services/nudgeServiceRegistry';
import { useSettingsStore } from '@/store/settingsStore';

// Persist a new or updated entry (stub; integrate with your database)
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
    // TODO: replace with real DB write
    console.log('Saving entry', entry.id);
    // Auto-save this journal entry into mem0 for testing; do not block the caller
    try {
        void autoSaveJournalEntry(entry);
    } catch (err) {
        console.warn('autoSaveJournalEntry error', err);
    }
    try {
        // Generate a contextual nudge if feature is enabled
        const showNudges = useSettingsStore.getState().autoReflect; // reuse existing flag for display - keep consistent
        if (showNudges) {
            const nudgeService = getNudgeService();
            const nudges = await nudgeService.generateNudgesForEntry(entry.id);
            if (nudges && nudges.length > 0) {
                const nudgeStore = (await import('@/store/nudgeStore'));
                // use the store API to show the nudge
                nudgeStore.useNudgeStore.getState().showNudge(nudges[0]);
            }
        }
    } catch (err) {
        console.warn('nudge generation failed', err);
    }
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
    try {
        void autoSaveReflection(reflection, { entryId });
    } catch (err) {
        console.warn('autoSaveReflection error', err);
    }
}
