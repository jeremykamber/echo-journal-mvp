import { ChatOllama } from '@langchain/ollama';
import {
    StateGraph,
    Annotation,
    START,
    END,
    MemorySaver,
} from '@langchain/langgraph/web';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OllamaEmbeddings } from '@langchain/ollama';
import { saveJournalEntry, saveReflection } from './entryService';

// Define the graph state with annotations
const graphState = Annotation.Root({
    entryId: Annotation<string>({ value: (_, curr) => curr, default: () => '' }),
    text: Annotation<string>({ value: (_, curr) => curr, default: () => '' }),
    reflectionRequest: Annotation<boolean>({ value: (_, curr) => curr, default: () => false }),
    docs: Annotation<any[]>({ value: (_, curr) => curr, default: () => [] }),
    vectorStore: Annotation<MemoryVectorStore>(),
    neighbors: Annotation<string[]>({ value: (_, curr) => curr, default: () => [] }),
    prompt: Annotation<string>({ value: (_, curr) => curr, default: () => '' }),
    reflection: Annotation<string>({ value: (_, curr) => curr, default: () => '' }),
    response: Annotation<string>({ value: (_, curr) => curr, default: () => '' }),
});

// Initialize LLM and text splitter
const chatModel = new ChatOllama({ model: 'qwen2.5:3b' });
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

// Build the state graph
const workflow = new StateGraph(graphState);

// Node 1: Persist entry
workflow.addNode('EntryIngest', async (state) => {
    await saveJournalEntry({ id: state.entryId, content: state.text, title: '', date: '' });
    return {};
});

// Node 2: Split text into docs
workflow.addNode('SplitText', async (state) => {
    const docs = await splitter.createDocuments([state.text]);
    return { docs };
});

// Node 3: Build vector store in-memory
workflow.addNode('UpsertVectors', async (state) => {
    const embedder = new OllamaEmbeddings({ model: 'nomic-embed-text' });
    const store = await MemoryVectorStore.fromDocuments(state.docs, embedder);
    return { vectorStore: store };
});

// Node 4: Perform similarity search if requested
workflow.addNode('SimilaritySearch', async (state) => {
    if (!state.reflectionRequest) return { neighbors: [] };
    const results = await state.vectorStore.similaritySearch(state.text, 5);
    const neighbors = results.map((d) => d.metadata.entryId as string);
    return { neighbors };
});

// Node 5: Build the AI prompt
workflow.addNode('BuildPrompt', (state) => {
    const context = state.neighbors.join('\n') || 'No relevant past entries.';
    const prompt = `You are Echo, an AI journaling companion.\nContext:\n${context}\n\nEntry:\n${state.text}`;
    return { prompt };
});

// Node 6: Generate AI reflection
workflow.addNode('GenerateReflection', async (state) => {
    // call expects array of messages
    const result = await (chatModel as any).call([{ role: 'user', content: state.prompt }]);
    return { reflection: result.text };
});

// Node 7: Persist the reflection
workflow.addNode('PersistReflection', async (state) => {
    await saveReflection(state.entryId, state.reflection);
    return {};
});

// Node 8: Emit the reflection back to UI
workflow.addNode('EmitResponse', (state) => ({ response: state.reflection }));

// Link the nodes
workflow.addEdge(START as any, 'EntryIngest' as any);
workflow.addEdge('EntryIngest' as any, 'SplitText' as any);
workflow.addEdge('SplitText' as any, 'UpsertVectors' as any);
workflow.addEdge('UpsertVectors' as any, 'SimilaritySearch' as any);
workflow.addEdge('SimilaritySearch' as any, 'BuildPrompt' as any);
workflow.addEdge('BuildPrompt' as any, 'GenerateReflection' as any);
workflow.addEdge('GenerateReflection' as any, 'PersistReflection' as any);
workflow.addEdge('PersistReflection' as any, 'EmitResponse' as any);
workflow.addEdge('EmitResponse' as any, END as any);

// Compile the graph with checkpointing
export const journalFlow = workflow.compile({ checkpointer: new MemorySaver() });
