/**
 * LLM Provider Hook
 *
 * Custom React hook for managing LLM provider instances based on user settings.
 * Handles creation, initialization, and cleanup of LLM providers.
 * Also sets the global provider for use in non-React code.
 *
 * Follows Single Responsibility Principle - only manages provider lifecycle.
 */

import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { LLMProvider } from './interface';
import { createLLMProvider, InitProgressCallback } from './providerFactory';
import { setGlobalLLMProvider } from './adapterService';

export interface UseLLMProviderOptions {
  onInitProgress?: InitProgressCallback;
}

/**
 * Hook to get and manage the current LLM provider based on settings.
 * Automatically switches providers when settings change.
 * Sets the global provider for access from non-React code.
 *
 * @param options - Optional configuration including progress callback
 * @returns Object with provider and initialization state
 *
 * @example
 * const { provider, isInitializing, error } = useLLMProvider({
 *   onInitProgress: (report) => console.log(report.text)
 * });
 */
export function useLLMProvider(options?: UseLLMProviderOptions) {
  const [provider, setProvider] = useState<LLMProvider | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [modelLoadingProgress, setModelLoadingProgress] = useState<string>('');

  const aiProvider = useSettingsStore(state => state.aiProvider);
  const localModelId = useSettingsStore(state => state.localModelId);
  const providerRef = useRef<LLMProvider | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeProvider = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Clean up old provider
        if (providerRef.current) {
          await providerRef.current.cleanup();
        }

        // Create new provider
        const newProvider = await createLLMProvider({
          mode: aiProvider,
          modelId: aiProvider === 'local' ? localModelId : undefined,
          initProgressCallback: (report) => {
            if (isMounted) {
              setModelLoadingProgress(report.text);
              options?.onInitProgress?.(report);
            }
          },
          autoInitialize: aiProvider === 'local',
        });

        if (isMounted) {
          providerRef.current = newProvider;
          setProvider(newProvider);
          // Set as global provider for non-React code access
          setGlobalLLMProvider(newProvider);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          console.error('Failed to initialize LLM provider:', error);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeProvider();

    return () => {
      isMounted = false;
    };
  }, [aiProvider, localModelId, options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.cleanup().catch(err => {
          console.warn('Error cleaning up LLM provider:', err);
        });
        setGlobalLLMProvider(null);
      }
    };
  }, []);

  return {
    provider,
    isInitializing,
    error,
    modelLoadingProgress,
  };
}
