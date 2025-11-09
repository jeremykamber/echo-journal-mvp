/**
 * LLMProvider Interface
 *
 * Abstract contract for all LLM provider implementations (OpenAI, WebLLM, etc.)
 * Enables pluggable LLM strategies without coupling to specific implementations.
 * Follows Dependency Inversion Principle and Strategy Pattern.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  /**
   * Stream a chat completion response.
   * Yields tokens as they are generated.
   *
   * @param options - Chat completion options including messages and model parameters
   * @returns AsyncGenerator that yields tokens as strings
   */
  streamChatCompletion(options: StreamChatCompletionOptions): AsyncGenerator<string, void, unknown>;

  /**
   * Get a non-streaming chat completion response.
   *
   * @param options - Chat completion options
   * @returns Promise that resolves to the complete response string
   */
  chatCompletion(options: StreamChatCompletionOptions): Promise<string>;

  /**
   * Check if the provider is ready to use (e.g., model loaded for WebLLM).
   *
   * @returns Promise that resolves to true if ready, false otherwise
   */
  isReady(): Promise<boolean>;

  /**
   * Initialize the provider if needed (e.g., load model for WebLLM).
   *
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources used by the provider.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;
}
