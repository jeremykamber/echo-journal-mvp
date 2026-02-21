// src/assets/clients/webllmClient.ts
// Simple webLLM client for chat and streaming

import { getGlobalLLMProvider } from '@/services/llmProviders/adapterService';
import { ChatMessage } from '@/services/llmProviders/interface';

export async function sendWebLLMMessage(messages: ChatMessage[]): Promise<string> {
  try {
    const provider = getGlobalLLMProvider();
    if (!provider) {
      throw new Error('WebLLM provider not initialized');
    }
    const result = await provider.chatCompletion({
      messages: messages as any, // webllm.ChatCompletionMessageParam
    });
    return result;
  } catch (err: any) {
    return `Error: ${err.message || 'Unknown error'}`;
  }
}

export async function* streamWebLLMMessage(messages: ChatMessage[]): AsyncGenerator<string> {
  try {
    const provider = getGlobalLLMProvider();
    if (!provider) {
      throw new Error('WebLLM provider not initialized');
    }
    for await (const token of provider.streamChatCompletion({
      messages: messages as any, // webllm.ChatCompletionMessageParam
    })) {
      yield token;
    }
  } catch (err: any) {
    yield `Error: ${err.message || 'Unknown error'}`;
  }
}
