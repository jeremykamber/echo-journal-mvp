import { addMemories, searchMemories } from '@/clients/mem0Client';
import journalStore from '@/store/journalStore';
import type { JournalEntry } from '@/store/journalStore';

// Note: embedder is typed as 'any' to avoid coupling to a specific embedder
// implementation; callers can inject an object with an `embed(texts: string[]) => Promise<any>` method.

export type MemoryService = {
    saveMemory: (params: { text: string; userId?: string; source?: string; sourceId?: string; metadata?: any }) => Promise<{ success: boolean; id?: string; error?: Error | null }>;
    searchMemory: (query: string, opts?: { userId?: string; limit?: number }) => Promise<{ results: any[]; total?: number; error?: Error | null }>;
    getRelevantMemories: (contextText: string, userId?: string, n?: number) => Promise<{ results: any[]; error?: Error | null }>;
    getPromptContext: (contextText: string, opts?: { userId?: string; n?: number; minMemories?: number; snippetSize?: number }) => Promise<{ contextBundle: string; relatedEntries: JournalEntry[] }>;
    batchSave?: (items: Array<{ text: string; userId?: string; source?: string; sourceId?: string; metadata?: any }>) => Promise<{ success: boolean; error?: Error | null }>;
    deleteMemory?: (id: string) => Promise<{ success: boolean }>;
};

export function makeMemoryService({ embedder }: { embedder?: any } = {}): MemoryService {
    return {
        saveMemory: async ({ text, userId, source, sourceId, metadata }) => {
            try {
                const toAdd = [{ memory: text, user_id: userId, metadata: { ...metadata, source, sourceId } }];
                const res = await addMemories(toAdd, { user_id: userId, metadata: { ...metadata, source, sourceId } });
                if (!res.success) return { success: false, error: res.error || new Error('mem0 add failed') };
                const ids = (res.result && res.result.memories) ? res.result.memories.map((m: any) => m.id) : undefined;
                return { success: true, id: ids ? ids[0] : undefined };
            } catch (err) {
                return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
            }
        },

        searchMemory: async (query, opts = {}) => {
            try {
                const res = await searchMemories(query, { user_id: opts.userId, limit: opts.limit || 10 });
                return { results: res.results, total: res.total || res.results.length, error: res.error };
            } catch (err) {
                return { results: [], total: 0, error: err instanceof Error ? err : new Error(String(err)) };
            }
        },

        getRelevantMemories: async (contextText, userId, n = 5) => {
            try {
                // Primary source: mem0 semantic search
                const res = await searchMemories(contextText, { user_id: userId, limit: n });
                return { results: res.results || [], error: res.error };
            } catch (err) {
                return { results: [], error: err instanceof Error ? err : new Error(String(err)) };
            }
        },

        batchSave: async (items: Array<{ text: string; userId?: string; source?: string; sourceId?: string; metadata?: any }>) => {
            // Normalize into mem0's expected shape and call addMemories once
            try {
                const toAdd = items.map((it) => ({ memory: it.text, user_id: it.userId, metadata: it.metadata || {} }));
                const res = await addMemories(toAdd, {});
                if (!res.success) return { success: false, error: res.error || new Error('mem0 batch add failed') };
                return { success: true, error: null };
            } catch (err) {
                return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
            }
        },

        getPromptContext: async (contextText, opts = {}) => {
            const n = opts.n || 4;
            const minMemories = opts.minMemories ?? 1;
            const snippetSize = opts.snippetSize || 400;
            try {
                // 1) Try mem0 semantic search first
                const searchRes = await searchMemories(contextText, { user_id: opts.userId, limit: n });
                const memResults = searchRes.results || [];

                if (memResults.length >= minMemories) {
                    // Build a compact context bundle from the top mem0 results
                    const top = memResults.slice(0, n).map((r: any) => {
                        const text = String(r.memory || r.content || r.text || '');
                        return text.length > snippetSize ? text.slice(0, snippetSize - 3) + '...' : text;
                    });
                    const contextBundle = top.join('\n---\n');

                    // Resolve related entries for citation where possible (metadata.sourceId)
                    const relatedEntries: JournalEntry[] = [];
                    const store = journalStore.getState();
                    memResults.slice(0, n).forEach((r: any) => {
                        const sourceId = r?.metadata?.sourceId || r?.metadata?.entryId || r?.sourceId;
                        if (sourceId) {
                            const entry = store.getEntryById(sourceId);
                            if (entry) relatedEntries.push(entry);
                        }
                    });

                    return { contextBundle, relatedEntries };
                }

                // 2) Fallback: if an embedder is available, use embedding similarity over entries
                const entries = journalStore.getState().entries || [];
                if (entries.length === 0) {
                    return { contextBundle: '', relatedEntries: [] };
                }

                if (embedder) {
                    try {
                        // Compute embedding for context and for entries (entries embeddings can be cached by consumer in future)
                        const ctxVec = await embedder.embed([contextText]);
                        const ctxEmbedding = ctxVec?.[0] || ctxVec?.data?.[0]?.embedding || ctxVec;
                        // Compute embeddings for entries
                        const texts = entries.map((e) => e.content || '');
                        const entryEmbedsRes = await embedder.embed(texts);
                        const entryEmbeddings = entryEmbedsRes?.data?.map((d: any) => d.embedding) || entryEmbedsRes || [];
                        // Compute cosine similarity
                        const similarities: Array<{ idx: number; score: number }> = entryEmbeddings.map((vec: number[], idx: number) => {
                            if (!vec || !ctxEmbedding) return { idx, score: 0 };
                            const dot = vec.reduce((s: number, v: number, i: number) => s + v * (ctxEmbedding[i] || 0), 0);
                            const magA = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0));
                            const magB = Math.sqrt((ctxEmbedding || []).reduce((s: number, v: number) => s + v * v, 0));
                            const score = magA && magB ? dot / (magA * magB) : 0;
                            return { idx, score };
                        });
                        similarities.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
                        const best = similarities[0];
                        const chosen = entries[best.idx];
                        const snippet = (chosen.content || '').slice(0, opts.snippetSize || 400);
                        const bundle = `[cite:${chosen.id}] ${snippet}`;
                        return { contextBundle: bundle, relatedEntries: [chosen] };
                    } catch (e) {
                        // Fall back to simple heuristic if embedder fails
                    }
                }

                // No embedder available or it failed: Simple heuristic: choose entry with highest word-overlap with contextText
                const ctxWords = new Set((contextText || '').toLowerCase().split(/\W+/).filter(Boolean));
                let best: { entry: JournalEntry | null; score: number } = { entry: null, score: 0 };
                entries.forEach((e) => {
                    const contentWords = (e.content || '').toLowerCase().split(/\W+/).filter(Boolean);
                    let score = 0;
                    contentWords.forEach((w) => { if (ctxWords.has(w)) score++; });
                    if (score > best.score) best = { entry: e, score };
                });

                // If no overlap, pick the most recent entry
                const chosen = best.entry || entries[entries.length - 1];
                const content = chosen.content || '';
                // Try to find the first matching word index to create a focused snippet
                let snippet = content.slice(0, snippetSize);
                for (const w of ctxWords) {
                    const idx = content.toLowerCase().indexOf(w);
                    if (idx >= 0) {
                        const start = Math.max(0, idx - Math.floor(snippetSize / 3));
                        snippet = content.slice(start, start + snippetSize);
                        if (start > 0) snippet = '...' + snippet;
                        if (snippet.length === snippetSize) snippet = snippet + '...';
                        break;
                    }
                }

                const bundle = `[cite:${chosen.id}] ${snippet.length > snippetSize ? snippet.slice(0, snippetSize - 3) + '...' : snippet}`;
                return { contextBundle: bundle, relatedEntries: [chosen] };
            } catch (err) {
                // On error, return empty context to avoid blocking LLM flows
                return { contextBundle: '', relatedEntries: [] };
            }
        },
        deleteMemory: async (id: string) => {
            try {
                // mem0Client.delete returns { success }
                // @ts-ignore
                const res = await (await import('@/clients/mem0Client')).deleteMemory(id);
                return { success: !!res?.success };
            } catch (err) {
                return { success: false };
            }
        }
    };
}

export default makeMemoryService;
