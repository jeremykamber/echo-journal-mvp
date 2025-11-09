/**
 * OpenAILLMProvider
 *
 * Implements LLMProvider interface for OpenAI API.
 * Wraps the existing LangChain OpenAI client to conform to our LLMProvider contract.
 *
 * Follows SOLID principles by abstracting OpenAI-specific details behind
 * the LLMProvider interface, enabling provider swapping.
 */

import { makeChatClient, makeRealtimeChatClient } from '@/clients/openaiClient';
import { LLMProvider, StreamChatCompletionOptions } from './interface';
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

/**
 * OpenAILLMProvider uses OpenAI API for chat completions.
 * Cloud-based inference with no local setup required.
 */
export class OpenAILLMProvider implements LLMProvider {
  private chatClient: ReturnType<typeof makeChatClient>;
  private realtimeChatClient: ReturnType<typeof makeRealtimeChatClient>;

  /**
   * Create a new OpenAILLMProvider instance.
   *
   * @param modelId - Optional model ID override (defaults to environment config)
   */
  constructor(modelId?: string) {
    this.chatClient = makeChatClient({ model: modelId });
    this.realtimeChatClient = makeRealtimeChatClient({ model: modelId });
  }

  /**
   * OpenAI provider is always ready (no initialization needed).
   *
   * @returns Always true
   */
  async isReady(): Promise<boolean> {
    return true;
  }

  /**
   * Initialize OpenAI provider (no-op for OpenAI as it requires no setup).
   */
  async initialize(): Promise<void> {
    // No initialization needed for OpenAI
  }

  /**
   * Clean up resources (no-op for OpenAI).
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for OpenAI
  }

  /**
   * Stream a chat completion response from OpenAI.
   *
   * @param options - Chat completion options
   * @returns AsyncGenerator yielding tokens as strings
   */
  async *streamChatCompletion(
    options: StreamChatCompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    // Convert our message format to LangChain format
    const messages: BaseMessage[] = options.messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
      }
    });

    try {
      // Use RunnableSequence with StringOutputParser to stream tokens
      const chain = RunnableSequence.from([this.realtimeChatClient, new StringOutputParser()]);
      const stream = await chain.stream(messages);

      for await (const token of stream) {
        if (token) {
          yield token;
        }
      }
    } catch (error) {
      console.error('Error in OpenAI streaming:', error);
      throw error;
    }
  }

  /**
   * Get a non-streaming chat completion from OpenAI.
   *
   * @param options - Chat completion options
   * @returns Promise resolving to the complete response string
   */
  async chatCompletion(options: StreamChatCompletionOptions): Promise<string> {
    // Convert our message format to LangChain format
    const messages: BaseMessage[] = options.messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
      }
    });

    try {
      const response = await this.chatClient.invoke(messages);
      const content = response.content;

      // Handle MessageContent type (can be string or complex array)
      if (typeof content === 'string') {
        return content;
      }
      if (Array.isArray(content)) {
        return content
          .map(c => {
            if (typeof c === 'string') return c;
            if (typeof c === 'object' && c !== null && 'text' in c) {
              return (c as { text: string }).text || '';
            }
            return '';
          })
          .join('');
      }
      return '';
    } catch (error) {
      console.error('Error in OpenAI chat completion:', error);
      throw error;
    }
  }
}
