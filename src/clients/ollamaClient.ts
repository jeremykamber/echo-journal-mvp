import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';

export function makeChatOllama(opts?: { model?: string }) {
    const model = opts?.model || 'qwen2.5:3b';
    return new ChatOllama({ model });
}

export function makeOllamaEmbeddings(opts?: { model?: string }) {
    const model = opts?.model || 'nomic-embed-text';
    return new OllamaEmbeddings({ model });
}

export const defaultChatOllama = makeChatOllama();
export const defaultOllamaEmbeddings = makeOllamaEmbeddings();
