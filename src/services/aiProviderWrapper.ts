/**
 * AI Service Provider Wrapper
 *
 * This module wraps the existing aiService to use the configured LLM provider
 * (cloud or local) instead of always using OpenAI.
 *
 * When settings specify "local", it uses WebLLM providers.
 * When settings specify "cloud", it falls back to the original OpenAI implementation.
 */

import { useSettingsStore } from '@/store/settingsStore';
import { getGlobalLLMProvider } from './llmProviders/adapterService';
import { ChatMessage } from './llmProviders/interface';

/**
 * Get the appropriate chat completion stream based on current settings.
 * Uses WebLLM provider if local mode is enabled and provider is initialized.
 * Falls back to aiService (OpenAI) if cloud mode or provider not ready.
 *
 * @param messages - Messages to send to the LLM
 * @param fallback - Fallback generator function (usually aiService implementation)
 * @returns AsyncGenerator yielding response tokens
 */
export async function* getStreamingResponse(
  messages: ChatMessage[],
  fallback: () => AsyncGenerator<string, void, unknown>,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string, void, unknown> {
  const settingsStore = useSettingsStore.getState();

  // Check if local mode is enabled
  if (settingsStore.aiProvider === 'local') {
    const provider = getGlobalLLMProvider();

    // If provider is ready, use it
    if (provider) {
      try {
        for await (const token of provider.streamChatCompletion({
          messages,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        })) {
          yield token;
        }
        return;
      } catch (error) {
        console.error('Error using local LLM provider, falling back to cloud:', error);
        // Fall through to fallback if there's an error
      }
    } else {
      console.warn(
        'Local mode selected but provider not initialized. Download the model in settings first, or falling back to cloud.'
      );
    }
  }

  // Use fallback (original OpenAI implementation)
  for await (const token of fallback()) {
    yield token;
  }
}

/**
 * Get non-streaming response based on current settings.
 * Uses WebLLM provider if local mode is enabled and provider is initialized.
 * Falls back to aiService (OpenAI) if cloud mode or provider not ready.
 *
 * @param messages - Messages to send to the LLM
 * @param fallback - Fallback function (usually aiService implementation)
 * @returns Promise resolving to complete response
 */
export async function getNonStreamingResponse(
  messages: ChatMessage[],
  fallback: () => Promise<string>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const settingsStore = useSettingsStore.getState();

  // Check if local mode is enabled
  if (settingsStore.aiProvider === 'local') {
    const provider = getGlobalLLMProvider();

    // If provider is ready, use it
    if (provider) {
      try {
        return await provider.chatCompletion({
          messages,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        });
      } catch (error) {
        console.error('Error using local LLM provider, falling back to cloud:', error);
        // Fall through to fallback if there's an error
      }
    } else {
      console.warn(
        'Local mode selected but provider not initialized. Download the model in settings first, or falling back to cloud.'
      );
    }
  }

  // Use fallback (original OpenAI implementation)
  return await fallback();
}
