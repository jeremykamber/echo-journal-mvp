// src/services/persistentVectorStore.ts

import { Document } from 'langchain/document';
import { makeOpenRouterEmbedder } from '@/clients/openaiClient';
import { useSettingsStore } from '@/store/settingsStore';
import { RestorableMemoryVectorStore } from 'langchain-js-restorable-memory-vectorstore';
import { JournalEntry } from '@/store/journalStore';
import { Message } from '@/store/conversationStore';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
// Persistence using browser localStorage instead of Node fs

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });

let store: RestorableMemoryVectorStore | null = null;

/** Initialise the store, loading from disk if present */
export async function initStore(): Promise<RestorableMemoryVectorStore> {
    if (store) return store;

    const settings = useSettingsStore.getState();
    const storageKey = settings.vectorStorePath || 'vector_store_data';

    // No directory handling needed for localStorage

    const embedder = makeOpenRouterEmbedder();

    // Load persisted data from localStorage if it exists
    const persisted = localStorage.getItem(storageKey);
    if (persisted) {
        try {
            store = new RestorableMemoryVectorStore(embedder);
            const data = JSON.parse(persisted) as any[];
            const docs = data.map(d => new Document({ pageContent: d.pageContent, metadata: d.metadata }));
            await store.addDocuments(docs);
        } catch (e) {
            console.warn('Failed to load persisted vector store from localStorage, starting fresh:', e);
            store = new RestorableMemoryVectorStore(embedder);
        }
    } else {
        // No persisted data – start with a fresh store
        store = new RestorableMemoryVectorStore(embedder);
    }

    return store!;
}

/** Add documents to the store and persist */
export async function addDocuments(docs: Document[]): Promise<void> {
    const s = await initStore();
    await s.addDocuments(docs);
    await persistStore();
}

/** Index a single journal entry by splitting it and adding to the store */
export async function indexJournalEntry(entry: JournalEntry): Promise<void> {
    const splits = await splitter.splitText(entry.content);
    const docs = splits.map(text => new Document({
        pageContent: text,
        metadata: {
            source: 'journal',
            entryId: entry.id,
            date: entry.date,
            title: entry.title
        }
    }));
    await addDocuments(docs);
}

/** Index a conversation message */
export async function indexConversationMessage(message: Message): Promise<void> {
    const docs = [new Document({
        pageContent: message.text,
        metadata: {
            source: 'conversation',
            messageId: message.messageId,
            conversationId: message.conversationId,
            sender: message.sender,
            timestamp: message.timestamp
        }
    })];
    await addDocuments(docs);
}

/** Similarity search */
export async function similaritySearch(
    query: string,
    k: number = 4,
): Promise<Document[]> {
    const s = await initStore();
    return await s.similaritySearch(query, k);
}


/** Similarity search with score */
export async function similaritySearchWithScore(
    query: string,
    k: number = 4,
): Promise<[Document, number][]> {
    const s = await initStore();
    return await s.similaritySearchWithScore(query, k);
}

/** Persist the store to disk */
export async function persistStore(): Promise<void> {
    if (!store) return;
    const settings = useSettingsStore.getState();
    const storageKey = settings.vectorStorePath || 'vector_store_data';
    try {
        const data = store.toJSON(); // Serialize the store
        localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to persist vector store to localStorage:', e);
    }
}
