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
export const AVAILABLE_MODELS = WebLLMService.getAllAvailableModels();

/**
 * Get all available model options as a flat list.
 *
 * @returns Array of all available models with their metadata
 */
export function getAllModels() {
  return AVAILABLE_MODELS;
}

/**
 * Get model name by ID.
 *
 * @param modelId - The model ID to look up
 * @returns Model metadata or undefined if not found
 */
export function getModelById(modelId: string) {
  return getAllModels().find(m => m === modelId);
}
