import { describe, it, expect, beforeEach, vi } from 'vitest';
import { autoSaveJournalEntry, flushAutosaveQueue } from '@/services/memoryAutoSave';
import * as memClient from '@/clients/mem0Client';
import journalStore from '@/store/journalStore';

describe('memoryAutoSave batching and dedupe', () => {
    beforeEach(() => {
        // reset journal store
        (journalStore as any).setState({ entries: [], messages: [] });
        vi.restoreAllMocks();
    });

    it('batches multiple saves into a single mem0.add call', async () => {
        const spy = vi.spyOn(memClient, 'addMemories').mockResolvedValue({ success: true, result: { memories: [{ id: '1' }, { id: '2' }] } });
        const id1 = journalStore.getState().createEntryWithData('T1', 'Alpha bravo charlie');
        const id2 = journalStore.getState().createEntryWithData('T2', 'Delta echo foxtrot');

        await autoSaveJournalEntry(journalStore.getState().getEntryById(id1)!);
        await autoSaveJournalEntry(journalStore.getState().getEntryById(id2)!);

        // force immediate flush
        await flushAutosaveQueue();

        expect(spy).toHaveBeenCalled();
        // Should be called with an array of at least 2
        const callArg = spy.mock.calls[0][0];
        expect(Array.isArray(callArg)).toBe(true);
        expect(callArg.length).toBeGreaterThanOrEqual(2);
    });

    it('dedupes identical quick successive saves', async () => {
        const spy = vi.spyOn(memClient, 'addMemories').mockResolvedValue({ success: true, result: { memories: [{ id: '1' }] } });
        const id1 = journalStore.getState().createEntryWithData('T1', 'Repeat repeat repeat');
        const entry = journalStore.getState().getEntryById(id1)!;
        await autoSaveJournalEntry(entry);
        // immediate second call should be deduped
        await autoSaveJournalEntry(entry);
        await flushAutosaveQueue();
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
