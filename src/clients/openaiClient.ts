import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

export function makeChatClient(opts?: { model?: string; apiKey?: string }) {
    const model = opts?.model || import.meta.env.VITE_OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';
    return new ChatOpenAI({
        model,
        streaming: false,
        apiKey: opts?.apiKey || import.meta.env.VITE_OPENAI_API_KEY,
    });
}

export function makeRealtimeChatClient(opts?: { model?: string; apiKey?: string }) {
    const model = opts?.model || 'gpt-4.1-nano';
    return new ChatOpenAI({
        model,
        streaming: true,
        apiKey: opts?.apiKey || import.meta.env.VITE_OPENAI_API_KEY,
    });
}

export function makeEmbedder(opts?: { model?: string; apiKey?: string }) {
    const model = opts?.model || 'text-embedding-ada-002';
    return new OpenAIEmbeddings({
        modelName: model,
        openAIApiKey: opts?.apiKey || import.meta.env.VITE_OPENAI_API_KEY,
    });
}

// Convenience default instances
export const defaultChatClient = makeChatClient();
export const defaultRealtimeChatClient = makeRealtimeChatClient();
export const defaultEmbedder = makeEmbedder();
