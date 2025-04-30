// filepath: src/services/llmService.ts
// Wraps LLM interactions (embeddings & chat) with easy swap between Ollama and OpenAI

// Chat models
import { ChatOpenAI } from '@langchain/openai';
export const chatClient = new ChatOpenAI({
    model: 'gpt-4.1-nano',
    // apiKey: process.env.OPENAI_API_KEY,
});
import { OllamaEmbeddings } from '@langchain/ollama';
/**
 * Get cosine similarity between two texts using Ollama embeddings via LangChain
 */
export async function getEmbeddingSimilarity(textA: string, textB: string): Promise<number> {
    // OpenAI version (commented out for now):
    // const embedder = new OpenAIEmbeddings({
    //     modelName: 'text-embedding-ada-002',
    //     openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    // });
    // const [vecA, vecB] = await embedder.embedDocuments([textA, textB]);

    // Ollama version:
    const embedder = new OllamaEmbeddings({ model: 'nomic-embed-text' });
    const [vecA, vecB] = await embedder.embedDocuments([textA, textB]);
    // Compute cosine similarity
    const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));
    return dot / (normA * normB);
}
