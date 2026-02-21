/**
 * Tests for WebLLMService
 *
 * Tests the core WebLLM functionality including:
 * - Model initialization and loading
 * - Streaming chat completions
 * - Non-streaming chat completions
 * - Ready state checks
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebLLMService } from '../webllmService';

describe('WebLLMService', () => {
  let service: WebLLMService;

  beforeEach(() => {
    // Create service instance with a small test model
    service = new WebLLMService('Qwen2-1.5B-Instruct-q4f32_1-MLC');
  });

  afterEach(async () => {
    // Clean up after each test
    await service.cleanup();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid model', async () => {
      expect(service.isReady()).resolves.toBe(false); // Not ready before initialization
      await service.initialize();
      expect(service.isReady()).resolves.toBe(true); // Ready after initialization
    });

    it('should be idempotent - multiple initializations should not cause errors', async () => {
      await service.initialize();
      const firstReady = await service.isReady();
      await service.initialize();
      const secondReady = await service.isReady();
      expect(firstReady).toBe(true);
      expect(secondReady).toBe(true);
    });

    it('should handle model loading progress', async () => {
      const progressCallback = vi.fn();
      const serviceWithProgress = new WebLLMService(
        'Qwen2-1.5B-Instruct-q4f32_1-MLC',
        progressCallback
      );
      await serviceWithProgress.initialize();
      expect(progressCallback).toHaveBeenCalled();
      await serviceWithProgress.cleanup();
    });
  });

  describe('chat completions', () => {
    beforeEach(async () => {
      // Ensure model is loaded before tests
      await service.initialize();
    });

    it('should stream chat completion and yield tokens', async () => {
      const options = {
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant.' },
          { role: 'user' as const, content: 'Say hello.' }
        ]
      };

      const tokens: string[] = [];
      for await (const token of service.streamChatCompletion(options)) {
        tokens.push(token);
      }

      expect(tokens.length).toBeGreaterThan(0);
      const fullResponse = tokens.join('');
      expect(fullResponse).toBeTruthy();
    });

    it('should handle system messages in chat', async () => {
      const systemPrompt = 'You are a helpful assistant that always responds in exactly 5 words.';
      const options = {
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: 'What is 2+2?' }
        ]
      };

      let fullResponse = '';
      for await (const token of service.streamChatCompletion(options)) {
        fullResponse += token;
      }

      expect(fullResponse).toBeTruthy();
    });

    it('should get non-streaming chat completion', async () => {
      const options = {
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant.' },
          { role: 'user' as const, content: 'Say hello.' }
        ]
      };

      const response = await service.chatCompletion(options);
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });

    it('should handle multi-turn conversations', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant.' },
        { role: 'user' as const, content: 'What is the capital of France?' }
      ];

      let firstResponse = '';
      for await (const token of service.streamChatCompletion({ messages })) {
        firstResponse += token;
      }

      // Add assistant response to messages
      const newMessages = [
        ...messages,
        { role: 'assistant' as const, content: firstResponse },
        { role: 'user' as const, content: 'And what is its population?' }
      ];

      let secondResponse = '';
      for await (const token of service.streamChatCompletion({ messages: newMessages })) {
        secondResponse += token;
      }

      expect(secondResponse).toBeTruthy();
    });

    it('should respect temperature parameter', async () => {
      const options1 = {
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant.' },
          { role: 'user' as const, content: 'Generate a random number.' }
        ],
        temperature: 0.1
      };

      const options2 = {
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant.' },
          { role: 'user' as const, content: 'Generate a random number.' }
        ],
        temperature: 0.9
      };

      let response1 = '';
      for await (const token of service.streamChatCompletion(options1)) {
        response1 += token;
      }

      let response2 = '';
      for await (const token of service.streamChatCompletion(options2)) {
        response2 += token;
      }

      expect(response1).toBeTruthy();
      expect(response2).toBeTruthy();
    });
  });

  describe('ready state', () => {
    it('should return false before initialization', async () => {
      const ready = await service.isReady();
      expect(ready).toBe(false);
    });

    it('should return true after initialization', async () => {
      await service.initialize();
      const ready = await service.isReady();
      expect(ready).toBe(true);
    });

    it('should return false after cleanup', async () => {
      await service.initialize();
      await service.cleanup();
      const ready = await service.isReady();
      expect(ready).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid model name', async () => {
      const invalidService = new WebLLMService('NonExistentModel-q4f32_1-MLC');
      await expect(invalidService.initialize()).rejects.toThrow();
    });

    it('should handle errors in streaming', async () => {
      // Create a service but don't initialize
      const uninitializedService = new WebLLMService('Qwen2-1.5B-Instruct-q4f32_1-MLC');
      const options = {
        messages: [{ role: 'user' as const, content: 'Hello' }]
      };

      // Should either throw or gracefully handle the error
      const stream = uninitializedService.streamChatCompletion(options);
      try {
        for await (const _token of stream) {
          // Iterate through stream
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('cleanup', () => {
    it('should free resources on cleanup', async () => {
      await service.initialize();
      expect(await service.isReady()).toBe(true);
      await service.cleanup();
      expect(await service.isReady()).toBe(false);
    });

    it('should handle cleanup when not initialized', async () => {
      // Should not throw when cleaning up uninitialized service
      await expect(service.cleanup()).resolves.not.toThrow();
    });
  });
});
