import { describe, it, expect, beforeEach } from 'vitest';
import makeMemoryService from '@/features/memory/services/memoryService';
import journalStore from '@/store/journalStore';

describe('memoryService.getPromptContext', () => {
    beforeEach(() => {
        // Reset journal store entries
        (journalStore as any).setState({ entries: [], messages: [] });
    });

    it('returns mem0 results when available and resolves related entries', async () => {
        const ms = makeMemoryService();
        const entryId = journalStore.getState().createEntryWithData('Test', 'I love pizza and pasta');

        // Save a memory that references the entry
        const saveRes = await ms.saveMemory({ text: 'I really like pizza', userId: 'u1', source: 'journal', sourceId: entryId, metadata: {} });
        expect(saveRes.success).toBe(true);

        const ctx = await ms.getPromptContext('pizza', { userId: 'u1', n: 3 });
        expect(ctx.contextBundle).toContain('pizza');
        expect(ctx.relatedEntries.length).toBeGreaterThanOrEqual(1);
        expect(ctx.relatedEntries[0].id).toBe(entryId);
    });

    it('falls back to a summarized journal snippet when no mem0 results', async () => {
        const ms = makeMemoryService();
        const entryId = journalStore.getState().createEntryWithData('Walk', 'Today I wandered into the mountains and enjoyed a long hike through the pines. It was refreshing.');

        const ctx = await ms.getPromptContext('mountain hike', { userId: 'u1', n: 3 });
        expect(ctx.contextBundle).toContain('[cite:');
        expect(ctx.relatedEntries.length).toBe(1);
        expect(ctx.relatedEntries[0].id).toBe(entryId);
    });
});
