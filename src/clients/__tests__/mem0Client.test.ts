import { describe, it, expect } from 'vitest';
import { addMemories, searchMemories, getAllMemories, deleteMemory } from '@/clients/mem0Client';

describe('mem0Client (in-memory shim)', () => {
    it('adds memories and returns them', async () => {
        const userId = 'test-user-1';
        const addRes = await addMemories([{ content: 'I love pizza and pasta' }], { user_id: userId });
        expect(addRes.success).toBe(true);
        expect(addRes.result).toBeDefined();
        const ids = addRes.result?.memories?.map((m: any) => m.id) || [];
        expect(ids.length).toBeGreaterThanOrEqual(1);
    });

    it('searches memories by substring and respects user filter', async () => {
        const userId = 'test-user-1';
        // ensure a known memory exists
        await addMemories([{ content: 'searchable-memory-xyz' }], { user_id: userId });

        const searchRes = await searchMemories('searchable', { user_id: userId, limit: 10 });
        expect(searchRes.error).toBeNull();
        expect(searchRes.results.length).toBeGreaterThanOrEqual(1);
        expect(searchRes.results.some((r: any) => String(r.memory).includes('searchable'))).toBe(true);
    });

    it('getAllMemories returns entries for a user', async () => {
        const userId = 'test-user-2';
        await addMemories([{ content: 'entry-a' }, { content: 'entry-b' }], { user_id: userId });
        const all = await getAllMemories({ user_id: userId });
        expect(all.results.length).toBeGreaterThanOrEqual(2);
    });

    it('deleteMemory removes an entry', async () => {
        const userId = 'test-user-delete';
        const addRes = await addMemories([{ content: 'to-be-deleted' }], { user_id: userId });
        const id = addRes.result?.memories?.[0]?.id;
        expect(id).toBeDefined();
        const del = await deleteMemory(id);
        expect(del.success).toBe(true);

        const postSearch = await searchMemories('to-be-deleted', { user_id: userId });
        expect(postSearch.results.some((r: any) => r.id === id)).toBe(false);
    });
});
