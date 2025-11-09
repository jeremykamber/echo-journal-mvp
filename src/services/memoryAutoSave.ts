import makeMemoryService from '@/features/memory/services/memoryService';
import { supabase } from '@/clients/supabaseClient';
import type { JournalEntry, Message } from '@/store/journalStore';

// Default to enabled for local testing unless explicitly disabled
const ENABLED = import.meta.env.VITE_ENABLE_MEMORIES === 'false' ? false : true;

// Dedupe and batching configuration
const DEDUPE_TTL_MS = Number(import.meta.env.VITE_MEMORIES_DEDUPE_TTL_MS || 30_000); // 30s default
const BATCH_FLUSH_MS = Number(import.meta.env.VITE_MEMORIES_BATCH_FLUSH_MS || 2_000); // 2s
const MAX_BATCH_SIZE = Number(import.meta.env.VITE_MEMORIES_MAX_BATCH || 25);

const memoryService = makeMemoryService({});

// Simple dedupe cache keyed by hash of text+source+sourceId
const dedupeCache = new Map<string, number>();

// Batch queue for coalescing writes
let batchQueue: Array<{ text: string; userId?: string; source?: string; sourceId?: string; metadata?: any }> = [];
let flushTimeout: any = null;

function hashKey(text: string, source?: string, sourceId?: string) {
    return `${source || 's'}::${sourceId || 'id'}::${text.slice(0, 200)}`;
}

async function getCurrentUserId(): Promise<string | undefined> {
    try {
        const { data } = await supabase.auth.getUser();
        return data.user?.id;
    } catch (e) {
        return undefined;
    }
}

async function flushBatch() {
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
    if (batchQueue.length === 0) return;
    const toSend = batchQueue.splice(0, MAX_BATCH_SIZE);
    try {
        if (typeof memoryService.batchSave === 'function') {
            await memoryService.batchSave(toSend.map((it) => ({ text: it.text, userId: it.userId, source: it.source, sourceId: it.sourceId, metadata: it.metadata })));
        } else {
            // Fall back to individual saves
            await Promise.all(toSend.map((it) => memoryService.saveMemory({ text: it.text, userId: it.userId, source: it.source, sourceId: it.sourceId, metadata: it.metadata })));
        }
    } catch (err) {
        console.warn('memory batch save failed', err);
    }
    // schedule next flush if queue still has items
    if (batchQueue.length > 0) {
        flushTimeout = setTimeout(flushBatch, BATCH_FLUSH_MS);
    }
}

async function queueSave(item: { text: string; userId?: string; source?: string; sourceId?: string; metadata?: any }) {
    batchQueue.push(item);
    if (batchQueue.length >= MAX_BATCH_SIZE) {
        await flushBatch();
        return;
    }
    if (!flushTimeout) {
        flushTimeout = setTimeout(flushBatch, BATCH_FLUSH_MS);
    }
}

export async function autoSaveJournalEntry(entry: JournalEntry): Promise<void> {
    if (!ENABLED) return;
    try {
        const text = (entry.content || '').trim();
        if (!text) return;
        const payloadText = text.length > 2000 ? text.slice(0, 1997) + '...' : text;
        const key = hashKey(payloadText, 'journal', entry.id);
        const now = Date.now();
        const last = dedupeCache.get(key) || 0;
        if (now - last < DEDUPE_TTL_MS) return; // deduped
        dedupeCache.set(key, now);
        const userId = await getCurrentUserId();
        queueSave({ text: payloadText, userId, source: 'journal', sourceId: entry.id, metadata: { title: entry.title, date: entry.date } });
    } catch (err) {
        console.warn('autoSaveJournalEntry failed', err);
    }
}

export async function autoSaveMessage(message: Message): Promise<void> {
    if (!ENABLED) return;
    try {
        const text = (message.text || '').trim();
        if (!text) return;
        const payloadText = text.length > 2000 ? text.slice(0, 1997) + '...' : text;
        const key = hashKey(payloadText, 'conversation', message.messageId || message.threadId);
        const now = Date.now();
        const last = dedupeCache.get(key) || 0;
        if (now - last < DEDUPE_TTL_MS) return;
        dedupeCache.set(key, now);
        const userId = await getCurrentUserId();
        queueSave({ text: payloadText, userId, source: 'conversation', sourceId: message.messageId || message.threadId, metadata: { sender: message.sender, threadId: message.threadId, isRealtimeReflection: message.isRealtimeReflection } });
    } catch (err) {
        console.warn('autoSaveMessage failed', err);
    }
}

export async function autoSaveReflection(reflectionText: string, opts: { entryId?: string; aiMessageId?: string } = {}): Promise<void> {
    if (!ENABLED) return;
    try {
        const text = (reflectionText || '').trim();
        if (!text) return;
        const payloadText = text.length > 2000 ? text.slice(0, 1997) + '...' : text;
        const key = hashKey(payloadText, 'realtime-reflection', opts.entryId || opts.aiMessageId);
        const now = Date.now();
        const last = dedupeCache.get(key) || 0;
        if (now - last < DEDUPE_TTL_MS) return;
        dedupeCache.set(key, now);
        const userId = await getCurrentUserId();
        queueSave({ text: payloadText, userId, source: 'realtime-reflection', sourceId: opts.entryId || opts.aiMessageId, metadata: { aiMessageId: opts.aiMessageId, entryId: opts.entryId } });
    } catch (err) {
        console.warn('autoSaveReflection failed', err);
    }
}

// Expose a manual flush helper for tests and debugging
export async function flushAutosaveQueue(): Promise<void> {
    await flushBatch();
}

export default { autoSaveJournalEntry, autoSaveMessage, autoSaveReflection, flushAutosaveQueue };
