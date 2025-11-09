/**
 * AIProviderSettings Component
 *
 * Allows users to select between cloud (OpenAI) and local (WebLLM) AI providers.
 * When local is selected, users can choose from available open-source models.
 * Shows real-time download progress for WebLLM model initialization.
 */

import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useLLMProvider } from '@/services/llmProviders/useLLMProvider';
import { AVAILABLE_MODELS, getModelById } from '@/services/llmProviders/providerFactory';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Zap } from 'lucide-react';
import ModelDownloadProgress from './ModelDownloadProgress';

/**
 * AIProviderSettings component for the settings page.
 * Allows switching between cloud and local AI providers.
 */
export const AIProviderSettings: React.FC = () => {
  const aiProvider = useSettingsStore(state => state.aiProvider);
  const localModelId = useSettingsStore(state => state.localModelId);
  const setSetting = useSettingsStore(state => state.setSetting);

  const { isInitializing, error, modelLoadingProgress } = useLLMProvider({
    onInitProgress: () => {
      // Progress callback can be used for additional logging if needed
    },
  });

  const currentModel = getModelById(localModelId);

  const handleProviderChange = (newProvider: 'cloud' | 'local') => {
    setSetting('aiProvider', newProvider);
  };

  const handleModelChange = (modelId: string) => {
    setSetting('localModelId', modelId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Choose how your AI model runs: in the cloud or locally on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            {/* Cloud Option */}
            <div
              className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition"
              onClick={() => handleProviderChange('cloud')}
            >
              <input
                type="radio"
                id="provider-cloud"
                name="provider"
                value="cloud"
                checked={aiProvider === 'cloud'}
                onChange={() => handleProviderChange('cloud')}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="provider-cloud"
                  className="flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <Cloud className="h-5 w-5" />
                  Cloud (OpenAI API)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Uses OpenAI's powerful models via API. Requires an API key and internet connection
                  for each request. Fast and reliable.
                </p>
              </div>
            </div>

            {/* Local Option */}
            <div
              className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition"
              onClick={() => handleProviderChange('local')}
            >
              <input
                type="radio"
                id="provider-local"
                name="provider"
                value="local"
                checked={aiProvider === 'local'}
                onChange={() => handleProviderChange('local')}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="provider-local"
                  className="flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <Zap className="h-5 w-5" />
                  Local (WebLLM)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Runs open-source models directly in your browser. No API calls needed after initial
                  download. Better privacy, works offline.
                </p>
              </div>
            </div>
          </div>

          {/* Local Model Selection */}
          {aiProvider === 'local' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="model-select">Select Local Model</Label>
                <p className="text-sm text-muted-foreground">
                  Choose a model based on your device capabilities and desired quality/speed tradeoff
                </p>

                <Select value={localModelId} onValueChange={handleModelChange}>
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AVAILABLE_MODELS).map(([size, models]) => (
                      <div key={size}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">
                          {size} Models
                        </div>
                        {models.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            <span>{model.name}</span>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Info */}
              {currentModel && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-semibold">{currentModel.name}</p>
                  <p className="text-xs text-muted-foreground">{currentModel.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Size: <strong>{currentModel.size}</strong>
                  </p>
                </div>
              )}

              {/* Model Size Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                  <div><strong>1.5B:</strong> Lightweight, works on most devices.</div>
                  <div><strong>3B:</strong> Better quality, requires more RAM.</div>
                  <div><strong>7B+:</strong> Best quality, requires 8GB+ RAM and modern GPU recommended.</div>
                </p>
              </div>

              {/* Download Progress */}
              <ModelDownloadProgress
                progressText={modelLoadingProgress}
                isLoading={isInitializing}
                error={error}
                modelName={currentModel?.name || 'Model'}
              />
            </div>
          )}

          {/* Cloud Provider Info */}
          {aiProvider === 'cloud' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Ensure your OpenAI API key is configured in environment variables for cloud inference
                to work properly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 text-base">About AI Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>
            <strong>Cloud (OpenAI):</strong> Uses state-of-the-art AI models hosted by OpenAI. Best
            for complex reasoning and highest quality responses. Requires paid API usage.
          </p>
          <p>
            <strong>Local (WebLLM):</strong> Runs open-source models directly in your browser using
            WebGPU acceleration. Great privacy, works offline, free to use. May be slower than cloud.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIProviderSettings;
