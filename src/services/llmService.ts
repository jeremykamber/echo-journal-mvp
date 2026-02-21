// filepath: src/services/llmService.ts
// Wraps LLM interactions (embeddings & chat) with easy swap between Ollama and OpenRouter

// Chat models
import { makeOpenRouterChatClient, makeOpenRouterEmbedder } from '@/clients/openaiClient';
export const chatClient = makeOpenRouterChatClient({ model: 'xiaomi/mimo-v2-flash:free' });
/**
 * Get cosine similarity between two texts using OpenRouter embeddings via LangChain
 */
export async function getEmbeddingSimilarity(textA: string, textB: string): Promise<number> {
    const embedder = makeOpenRouterEmbedder({ model: 'text-embedding-3-small' });
    const [vecA, vecB] = await embedder.embedDocuments([textA, textB]);

    // Compute cosine similarity
    const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));
    return dot / (normA * normB);
}
