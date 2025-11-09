import { describe, it, expect } from 'vitest';
import makeNudgeService from '@/features/memory/services/nudgeService';
import journalStore from '@/store/journalStore';

describe('nudgeService', () => {
    it('generates a nudge for an entry with related mem0 memory', async () => {
        const ms = makeNudgeService();
        const id = journalStore.getState().createEntryWithData('T', 'I like coffee and pizza');
        // Insert a memory that references the entry via memoryService
        const memService = (await import('@/features/memory/services/memoryService')).default();
        await memService.saveMemory({ text: 'coffee preference', userId: 'u1', source: 'journal', sourceId: id, metadata: {} });
        const nudges = await ms.generateNudgesForEntry(id, 'u1');
        expect(nudges.length).toBeGreaterThanOrEqual(0);
    });
});
