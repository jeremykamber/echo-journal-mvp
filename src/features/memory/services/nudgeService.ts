import makeMemoryService from './memoryService';

export type Nudge = {
    id: string;
    text: string;
    reason?: string;
    relatedEntryIds?: string[];
    source?: 'entry' | 'conversation' | 'reflection';
    createdAt: string;
};

export function makeNudgeService({ memoryService = makeMemoryService() } = {}) {
    return {
        async generateNudgesForEntry(entryId: string, userId?: string): Promise<Nudge[]> {
            try {
                const entry = (await import('@/store/journalStore')).default.getState().getEntryById(entryId);
                if (!entry) return [];
                const ctx = await memoryService.getPromptContext(entry.content || '', { userId, n: 3, minMemories: 1 });
                if (!ctx.contextBundle) return [];
                // Simple suggestion extraction: take the first sentence or a heuristic phrase
                const suggestion = (ctx.contextBundle.split('\n')[0] || '').slice(0, 200);
                const nudge: Nudge = {
                    id: `nudge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    text: suggestion || 'Try reflecting on this key theme',
                    reason: ctx.contextBundle,
                    relatedEntryIds: ctx.relatedEntries.map(e => e.id),
                    source: 'entry',
                    createdAt: new Date().toISOString()
                };
                return [nudge];
            } catch (err) {
                return [];
            }
        },

        async generateNudgesForReflection(reflectionText: string, entryId?: string, userId?: string): Promise<Nudge[]> {
            try {
                const ctx = await memoryService.getPromptContext(reflectionText, { userId, n: 3, minMemories: 1 });
                if (!ctx.contextBundle) return [];
                const suggestion = (ctx.contextBundle.split('\n')[0] || '').slice(0, 200);
                const nudge: Nudge = {
                    id: `nudge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    text: suggestion || 'Consider a small next step based on this reflection',
                    reason: ctx.contextBundle,
                    relatedEntryIds: ctx.relatedEntries.map(e => e.id),
                    source: 'reflection',
                    createdAt: new Date().toISOString()
                };
                return [nudge];
            } catch (err) {
                return [];
            }
        }
    };
}

export default makeNudgeService;
