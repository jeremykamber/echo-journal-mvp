/**
 * WebLLMService
 *
 * Implements LLMProvider interface for WebLLM in-browser inference.
 * Handles model initialization, loading, and chat completions using WebLLM.
 *
 * Follows SOLID principles:
 * - Single Responsibility: Only manages WebLLM interactions
 * - Dependency Inversion: Implements LLMProvider interface
 * - Open/Closed: New features added without modifying interface
 */

import * as webllm from '@mlc-ai/web-llm';
import { LLMProvider, StreamChatCompletionOptions } from './interface';

export type InitProgressCallback = (report: webllm.InitProgressReport) => void;

/**
 * WebLLMService provides local LLM inference in the browser using WebLLM.
 * Supports streaming and non-streaming chat completions with various open-source models.
 */
export class WebLLMService implements LLMProvider {
  private engine: webllm.MLCEngineInterface | null = null;
  private modelId: string;
  private isInitializing: boolean = false;
  private initProgress: InitProgressCallback | undefined;

  /**
   * Create a new WebLLMService instance.
   *
   * @param modelId - The model ID to use (e.g., 'Qwen2-1.5B-Instruct-q4f32_1-MLC')
   * @param initProgressCallback - Optional callback to track initialization progress
   */
  constructor(modelId: string, initProgressCallback?: InitProgressCallback) {
    this.modelId = modelId;
    this.initProgress = initProgressCallback;
  }

  /**
   * Initialize the WebLLM engine and load the selected model.
   * Safe to call multiple times (idempotent).
   *
   * @throws Error if model fails to load or initialization is interrupted
   */
  async initialize(): Promise<void> {
    // Prevent multiple concurrent initializations
    if (this.isInitializing) {
      // Wait for existing initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Skip if already initialized
    if (this.engine !== null) {
      return;
    }

    this.isInitializing = true;
    try {
      const initProgressCallback = (report: webllm.InitProgressReport) => {
        console.log('[WebLLM]', report.text);
        if (this.initProgress) {
          this.initProgress(report);
        }
      };

      try {
        console.log(`[WebLLM] Initializing model: ${this.modelId}`);
        this.engine = await webllm.CreateMLCEngine(this.modelId, {
          initProgressCallback,
        });
        console.log('[WebLLM] Model initialized successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[WebLLM] Failed to initialize model: ${errorMessage}`);
        
        // Provide more helpful error messages
        if (errorMessage.includes('Cache') || errorMessage.includes('network error')) {
          throw new Error(
            'Network error downloading model. This could be due to: ' +
            '1) Unstable internet connection - please ensure you have stable internet and try again. ' +
            '2) Browser storage/cache issues - try clearing browser cache (Settings > Clear browsing data > Cache) and reload. ' +
            '3) Model repository temporarily unavailable - try again in a few moments. ' +
            'Original error: ' + errorMessage
          );
        }
        
        throw error;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Check if the engine is ready for inference.
   *
   * @returns true if engine is initialized, false otherwise
   */
  async isReady(): Promise<boolean> {
    return this.engine !== null && !this.isInitializing;
  }

  /**
   * Stream a chat completion response, yielding tokens as they are generated.
   * Requires initialization before use.
   *
   * @param options - Chat completion options including messages
   * @returns AsyncGenerator yielding tokens as strings
   * @throws Error if engine not initialized
   */
  async *streamChatCompletion(
    options: StreamChatCompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!this.engine) {
      throw new Error('WebLLMService not initialized. Call initialize() first.');
    }

    const request: webllm.ChatCompletionRequest = {
      messages: options.messages as webllm.ChatCompletionMessageParam[],
      stream: true,
      stream_options: { include_usage: true },
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    };

    try {
      const asyncChunkGenerator = await this.engine.chat.completions.create(request);

      for await (const chunk of asyncChunkGenerator) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('Error in WebLLM streaming:', error);
      throw error;
    }
  }

  /**
   * Get a non-streaming chat completion response.
   * Collects all streamed tokens and returns the complete response.
   *
   * @param options - Chat completion options
   * @returns Promise resolving to the complete response string
   */
  async chatCompletion(options: StreamChatCompletionOptions): Promise<string> {
    if (!this.engine) {
      throw new Error('WebLLMService not initialized. Call initialize() first.');
    }

    const request: webllm.ChatCompletionRequest = {
      messages: options.messages as webllm.ChatCompletionMessageParam[],
      stream: false,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    };

    try {
      await this.engine.chat.completions.create(request);
      const message = await this.engine.getMessage();
      return message || '';
    } catch (error) {
      console.error('Error in WebLLM chat completion:', error);
      throw error;
    }
  }

  /**
   * Clean up WebLLM resources and free memory.
   * Safe to call even if not initialized.
   */
  async cleanup(): Promise<void> {
    if (this.engine) {
      try {
        // WebLLM doesn't have a dispose method, so we just reset the engine
        await this.engine.resetChat();
      } catch (error) {
        console.warn('Error resetting WebLLM engine:', error);
      }
      this.engine = null;
    }
  }
}
