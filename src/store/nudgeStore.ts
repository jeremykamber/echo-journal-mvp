import { create } from 'zustand';

export interface NudgeStateItem {
    id: string;
    text: string;
    reason?: string;
    relatedEntryIds?: string[];
    source?: 'entry' | 'conversation' | 'reflection';
    createdAt: string;
    dismissed?: boolean;
}

type NudgeState = {
    current?: NudgeStateItem;
    history: NudgeStateItem[];
    showNudge: (n: NudgeStateItem) => void;
    dismissCurrent: () => void;
    forgetRelated: (entryIds?: string[]) => Promise<void>;
};

export const useNudgeStore = create<NudgeState>((set, _get) => ({
    current: undefined,
    history: [],
    showNudge: (n) => set((s) => ({ current: n, history: [n, ...s.history] })),
    dismissCurrent: () => set(() => ({ current: undefined })),
    forgetRelated: async (entryIds) => {
        try {
            // If nudge has related entries, delete memories referencing them via service
            // Import memoryService lazily to avoid circular deps
            const memoryService = (await import('@/features/memory/services/memoryService')).default();
            if (entryIds && entryIds.length > 0) {
                for (const id of entryIds) {
                    // Attempt to delete by sourceId if mem0 saved memory with sourceId metadata
                    if (typeof memoryService.deleteMemory === 'function') {
                        // Best-effort: search for mem entries referencing the entryId
                        const res = await memoryService.searchMemory(id, { limit: 50 });
                        for (const r of res.results || []) {
                            const memId = r.id || r.memory_id || r.message_id || r.external_id;
                            if (memId && typeof memoryService.deleteMemory === 'function') {
                                await memoryService.deleteMemory(memId);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('forgetRelated failed', err);
        }
    }
}));

export default useNudgeStore;
