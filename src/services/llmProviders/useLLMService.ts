/**
 * useLLMService Hook
 *
 * High-level hook for accessing the active LLM provider instance.
 * Manages a single provider instance across the application.
 * Automatically switches providers when settings change.
 *
 * This hook combines the LLMProvider interface with React lifecycle management.
 */

import { useState } from 'react';
import { useLLMProvider } from './useLLMProvider';
import { LLMProvider, StreamChatCompletionOptions } from './interface';

interface UseLLMServiceReturn {
  /**
   * The active LLM provider instance
   */
  provider: LLMProvider | null;
  /**
   * Whether the provider is currently initializing
   */
  isInitializing: boolean;
  /**
   * Error if provider initialization failed
   */
  error: Error | null;
  /**
   * Current model loading progress text
   */
  modelLoadingProgress: string;
  /**
   * Stream chat completion tokens
   * @param options Chat completion options
   * @returns AsyncGenerator yielding tokens
   */
  streamChatCompletion: (
    options: StreamChatCompletionOptions
  ) => AsyncGenerator<string, void, unknown>;
  /**
   * Get non-streaming chat completion
   * @param options Chat completion options
   * @returns Promise resolving to complete response
   */
  chatCompletion: (options: StreamChatCompletionOptions) => Promise<string>;
}

/**
 * Hook to access and manage the LLM service.
 * Handles provider initialization, switching, and method access.
 *
 * @returns Object with provider instance and helper methods
 * @throws Error if provider methods are called before initialization
 *
 * @example
 * const { provider, streamChatCompletion, isInitializing } = useLLMService();
 *
 * if (isInitializing) return <LoadingSpinner />;
 *
 * // Use streaming
 * for await (const token of streamChatCompletion({ messages: [...] })) {
 *   console.log(token);
 * }
 */
export function useLLMService(): UseLLMServiceReturn {
  const { provider, isInitializing, error, modelLoadingProgress } = useLLMProvider();
  const [streamError, setStreamError] = useState<Error | null>(null);

  /**
   * Wrapped streaming method with error handling
   */
  const streamChatCompletion = async function* (
    options: StreamChatCompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (!provider) {
        throw new Error('LLM provider not initialized');
      }

      for await (const token of provider.streamChatCompletion(options)) {
        yield token;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setStreamError(error);
      throw error;
    }
  };

  /**
   * Wrapped chat completion method with error handling
   */
  const chatCompletion = async (options: StreamChatCompletionOptions): Promise<string> => {
    try {
      if (!provider) {
        throw new Error('LLM provider not initialized');
      }

      return await provider.chatCompletion(options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setStreamError(error);
      throw error;
    }
  };

  return {
    provider,
    isInitializing,
    error: error || streamError,
    modelLoadingProgress,
    streamChatCompletion,
    chatCompletion,
  };
}
