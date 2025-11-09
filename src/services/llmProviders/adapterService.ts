/**
 * LLM Service Adapter
 *
 * Adapts the existing aiService functions to work with pluggable LLM providers.
 * This acts as a bridge between React hooks (useLLMService) and the existing
 * async generator-based aiService functions.
 *
 * Enables gradual migration from direct OpenAI usage to the provider pattern.
 */

import { LLMProvider, StreamChatCompletionOptions } from './interface';

/**
 * Global provider instance (singleton pattern)
 * Used to maintain state across component rerenders
 */
let globalProvider: LLMProvider | null = null;

/**
 * Set the global LLM provider instance
 *
 * @param provider - The LLM provider to set as global
 */
export function setGlobalLLMProvider(provider: LLMProvider | null): void {
  globalProvider = provider;
}

/**
 * Get the current global LLM provider instance
 *
 * @returns The current global provider or null if not initialized
 */
export function getGlobalLLMProvider(): LLMProvider | null {
  return globalProvider;
}

/**
 * Stream chat completion tokens using the global provider
 *
 * @param options - Chat completion options
 * @returns AsyncGenerator yielding tokens
 * @throws Error if provider not initialized
 */
export async function* streamWithGlobalProvider(
  options: StreamChatCompletionOptions
): AsyncGenerator<string, void, unknown> {
  const provider = getGlobalLLMProvider();
  if (!provider) {
    throw new Error('LLM provider not initialized. Please initialize in a React component using useLLMService.');
  }

  for await (const token of provider.streamChatCompletion(options)) {
    yield token;
  }
}

/**
 * Get non-streaming chat completion using the global provider
 *
 * @param options - Chat completion options
 * @returns Promise resolving to complete response
 * @throws Error if provider not initialized
 */
export async function chatWithGlobalProvider(
  options: StreamChatCompletionOptions
): Promise<string> {
  const provider = getGlobalLLMProvider();
  if (!provider) {
    throw new Error('LLM provider not initialized. Please initialize in a React component using useLLMService.');
  }

  return await provider.chatCompletion(options);
}
