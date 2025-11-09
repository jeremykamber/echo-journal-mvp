// filepath: src/services/llmService.ts
// Wraps LLM interactions (embeddings & chat) with easy swap between Ollama and OpenAI

// Chat models
import { makeChatClient, makeEmbedder } from '@/clients/openaiClient';
export const chatClient = makeChatClient({ model: 'gpt-5-nano' });
/**
 * Get cosine similarity between two texts using Ollama embeddings via LangChain
 */
export async function getEmbeddingSimilarity(textA: string, textB: string): Promise<number> {
    const embedder = makeEmbedder({ model: 'text-embedding-ada-002' });
    const [vecA, vecB] = await embedder.embedDocuments([textA, textB]);

    // Compute cosine similarity
    const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));
    return dot / (normA * normB);
}
