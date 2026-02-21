import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

// OpenAI API clients (default OpenAI endpoint)
export function makeChatClient(opts?: { model?: string; apiKey?: string }) {
    const model =
        opts?.model ||
        import.meta.env.VITE_OPENAI_DEFAULT_MODEL ||
        "gpt-4.1-mini";
    return new ChatOpenAI({
        model,
        streaming: false,
        apiKey: opts?.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
    });
}

export function makeRealtimeChatClient(opts?: {
    model?: string;
    apiKey?: string;
}) {
    const model = opts?.model || "gpt-4.1-nano";
    return new ChatOpenAI({
        model,
        streaming: true,
        apiKey: opts?.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
    });
}

export function makeEmbedder(opts?: { model?: string; apiKey?: string }) {
    const model = opts?.model || "text-embedding-ada-002";
    return new OpenAIEmbeddings({
        modelName: model,
        openAIApiKey: opts?.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
    });
}

// OpenRouter API clients
export function makeOpenRouterChatClient(opts?: { model?: string; apiKey?: string }) {
    const model = opts?.model || "xiaomi/mimo-v2-flash:free";
    return new ChatOpenAI({
        model,
        streaming: false,
        apiKey: opts?.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
}

export function makeOpenRouterRealtimeChatClient(opts?: {
    model?: string;
    apiKey?: string;
}) {
    const model = opts?.model || "xiaomi/mimo-v2-flash:free";
    return new ChatOpenAI({
        model,
        streaming: true,
        apiKey: opts?.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
}

export function makeOpenRouterEmbedder(opts?: { model?: string; apiKey?: string }) {
    const model = opts?.model || "text-embedding-3-small";
    return new OpenAIEmbeddings({
        modelName: model,
        openAIApiKey: opts?.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
}

// Convenience default instances
export const defaultChatClient = makeChatClient();
export const defaultRealtimeChatClient = makeRealtimeChatClient();
export const defaultEmbedder = makeEmbedder();
export const defaultOpenRouterChatClient = makeOpenRouterChatClient();
export const defaultOpenRouterRealtimeChatClient = makeOpenRouterRealtimeChatClient();
export const defaultOpenRouterEmbedder = makeOpenRouterEmbedder();
