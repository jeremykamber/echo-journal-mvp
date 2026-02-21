/**
 * Tests for LLMProviderFactory
 *
 * Tests the factory pattern implementation for creating appropriate
 * LLM provider instances based on configuration settings.
 */

import { describe, it, expect, vi } from 'vitest';
import { createLLMProvider } from '../providerFactory';

describe('LLMProviderFactory', () => {
  describe('createLLMProvider', () => {
    it('should create OpenAI provider when mode is "cloud"', async () => {
      const provider = await createLLMProvider({ mode: 'cloud' });
      expect(provider).toBeDefined();
      // OpenAI provider should be ready immediately (no loading needed)
      const ready = await provider.isReady();
      expect(ready).toBe(true);
    });

    it('should create WebLLM provider when mode is "local"', async () => {
      const provider = await createLLMProvider({
        mode: 'local',
        modelId: 'Qwen2-1.5B-Instruct-q4f32_1-MLC'
      });
      expect(provider).toBeDefined();
      // WebLLM should not be ready before initialization
      const ready = await provider.isReady();
      expect(ready).toBe(false);
    });

    it('should initialize WebLLM provider on creation if initProgressCallback provided', async () => {
      const progressCallback = vi.fn();
      const provider = await createLLMProvider({
        mode: 'local',
        modelId: 'Qwen2-1.5B-Instruct-q4f32_1-MLC',
        initProgressCallback: progressCallback
      });

      expect(provider).toBeDefined();
      // Should have called progress callback during initialization
      expect(progressCallback).toHaveBeenCalled();

      // Clean up
      await provider.cleanup();
    });

    it('should use default OpenAI model when no specific model provided for cloud', async () => {
      const provider = await createLLMProvider({ mode: 'cloud' });
      expect(provider).toBeDefined();
      const ready = await provider.isReady();
      expect(ready).toBe(true);
    });

    it('should throw error when local mode but no modelId provided', async () => {
      await expect(
        createLLMProvider({ mode: 'local' })
      ).rejects.toThrow('modelId is required for local mode');
    });

    it('should support multiple provider instances', async () => {
      const provider1 = await createLLMProvider({ mode: 'cloud' });
      const provider2 = await createLLMProvider({ mode: 'cloud' });

      expect(provider1).toBeDefined();
      expect(provider2).toBeDefined();
      expect(provider1).not.toBe(provider2); // Different instances
    });

    it('should clean up WebLLM resources when provider cleaned up', async () => {
      const provider = await createLLMProvider({
        mode: 'local',
        modelId: 'Qwen2-1.5B-Instruct-q4f32_1-MLC'
      });

      await provider.initialize();
      expect(await provider.isReady()).toBe(true);

      await provider.cleanup();
      expect(await provider.isReady()).toBe(false);
    });

    it('should support all listed model options', async () => {
      const modelIds = [
        'Qwen2-1.5B-Instruct-q4f32_1-MLC',
        'Phi-3.5-mini-instruct-q4f32_1-MLC',
        'Llama-3.2-1B-Instruct-q4f32_1-MLC',
        'Llama-3.1-8B-Instruct-q4f32_1-MLC',
        'Mistral-7B-Instruct-v0.3-q4f32_1-MLC'
      ];

      for (const modelId of modelIds) {
        const provider = await createLLMProvider({
          mode: 'local',
          modelId
        });
        expect(provider).toBeDefined();
        await provider.cleanup();
      }
    });
  });
});
