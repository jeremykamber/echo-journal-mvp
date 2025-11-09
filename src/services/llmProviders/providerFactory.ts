/**
 * LLMProviderFactory
 *
 * Factory pattern for creating LLM provider instances based on configuration.
 * Enables easy provider selection and instantiation without coupling
 * higher-level code to specific provider implementations.
 *
 * Follows Factory Pattern and Dependency Inversion Principle.
 */

import { LLMProvider } from './interface';
import { OpenAILLMProvider } from './openaiProvider';
import { WebLLMService, InitProgressCallback } from './webllmService';

export type { InitProgressCallback };

export interface LLMProviderConfig {
  /** 'cloud' for OpenAI API, 'local' for WebLLM */
  mode: 'cloud' | 'local';
  /** Model ID for local mode (required when mode='local') */
  modelId?: string;
  /** Callback to track WebLLM initialization progress */
  initProgressCallback?: InitProgressCallback;
  /** Whether to auto-initialize WebLLM (defaults to true for local mode) */
  autoInitialize?: boolean;
}

/**
 * Create an LLM provider instance based on configuration.
 *
 * @param config - Provider configuration including mode and optional parameters
 * @returns Promise resolving to an initialized LLMProvider instance
 * @throws Error if config is invalid (e.g., local mode without modelId)
 *
 * @example
 * // Create cloud provider (OpenAI)
 * const cloudProvider = await createLLMProvider({ mode: 'cloud' });
 *
 * @example
 * // Create local provider (WebLLM)
 * const localProvider = await createLLMProvider({
 *   mode: 'local',
 *   modelId: 'Qwen2-1.5B-Instruct-q4f32_1-MLC',
 *   initProgressCallback: (report) => console.log(report.text)
 * });
 */
export async function createLLMProvider(config: LLMProviderConfig): Promise<LLMProvider> {
  if (config.mode === 'cloud') {
    // Cloud mode uses OpenAI API
    return new OpenAILLMProvider(config.modelId);
  } else if (config.mode === 'local') {
    // Local mode uses WebLLM
    if (!config.modelId) {
      throw new Error('modelId is required for local mode');
    }

    const service = new WebLLMService(config.modelId, config.initProgressCallback);

    // Auto-initialize if requested (defaults to true)
    const shouldAutoInit = config.autoInitialize !== false;
    if (shouldAutoInit) {
      await service.initialize();
    }

    return service;
  } else {
    throw new Error(`Invalid provider mode: ${config.mode}`);
  }
}

/**
 * Available WebLLM model options organized by size.
 * These are pre-compiled MLC models optimized for in-browser inference.
 */
export const AVAILABLE_MODELS = {
  '1.5B': [
    {
      id: 'Qwen2-1.5B-Instruct-q4f32_1-MLC',
      name: 'Qwen 2 1.5B Instruct',
      description: 'Lightweight model suitable for most devices',
    },
  ],
  '3B': [
    {
      id: 'Phi-3.5-mini-instruct-q4f32_1-MLC',
      name: 'Phi 3.5 Mini Instruct',
      description: 'Microsoft model with good quality/speed tradeoff',
    },
    {
      id: 'Gemma-2-9b-it-q4f32_1-MLC',
      name: 'Gemma 2 9B IT',
      description: 'Google model optimized for instructions',
    },
  ],
  '7B+': [
    {
      id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
      name: 'Llama 3.2 1B Instruct',
      description: 'Meta model, good instruction following',
    },
    {
      id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
      name: 'Llama 3.1 8B Instruct',
      description: 'Larger model with better reasoning (8B)',
    },
    {
      id: 'Mistral-7B-Instruct-v0.3-q4f32_1-MLC',
      name: 'Mistral 7B Instruct v0.3',
      description: 'Mistral model with strong instruction following',
    },
  ],
} as const;

/**
 * Get all available model options as a flat list.
 *
 * @returns Array of all available models with their metadata
 */
export function getAllModels() {
  const allModels: Array<{
    id: string;
    name: string;
    description: string;
    size: string;
  }> = [];

  (Object.entries(AVAILABLE_MODELS) as Array<[string, typeof AVAILABLE_MODELS['1.5B']]>).forEach(
    ([size, models]) => {
      models.forEach(model => {
        allModels.push({
          ...model,
          size,
        });
      });
    }
  );

  return allModels;
}

/**
 * Get model name by ID.
 *
 * @param modelId - The model ID to look up
 * @returns Model metadata or undefined if not found
 */
export function getModelById(modelId: string) {
  return getAllModels().find(m => m.id === modelId);
}
