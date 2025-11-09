/**
 * ModelDownloadProgress Component
 *
 * Displays progress of WebLLM model downloading and initialization.
 * Shows percentage, current task, and estimated time.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle2 } from 'lucide-react';

interface ModelDownloadProgressProps {
  /**
   * Current progress status message from WebLLM
   */
  progressText: string;
  /**
   * Whether the model is currently loading
   */
  isLoading: boolean;
  /**
   * Error message if loading failed
   */
  error: Error | null;
  /**
   * Model name being downloaded
   */
  modelName: string;
}

/**
 * Component that displays model download and initialization progress.
 * Updates in real-time as WebLLM loads the model.
 *
 * @param props - Component props
 * @returns React component showing download progress or completion status
 */
export const ModelDownloadProgress: React.FC<ModelDownloadProgressProps> = ({
  progressText,
  isLoading,
  error,
  modelName,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [progress, setProgress] = useState(0);

  // Parse progress percentage from status text
  useEffect(() => {
    setDisplayText(progressText);

    // Try to extract percentage from progress text
    const percentageMatch = progressText.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentageMatch) {
      setProgress(parseFloat(percentageMatch[1]));
    }

    // Also try to parse "X/Y" format
    const fractionMatch = progressText.match(/(\d+)\/(\d+)/);
    if (fractionMatch) {
      const current = parseInt(fractionMatch[1]);
      const total = parseInt(fractionMatch[2]);
      setProgress((current / total) * 100);
    }
  }, [progressText]);

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
        <p className="text-sm text-destructive font-medium">
          Failed to load model: {error.message}
        </p>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 animate-spin" />
            Loading {modelName}
          </CardTitle>
          <CardDescription>
            Downloading and preparing model for local inference
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {progress.toFixed(0)}% complete
            </p>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {displayText}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            First download may take several minutes depending on model size and internet speed
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show success state
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
          <CheckCircle2 className="h-5 w-5" />
          {modelName} Ready
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-green-800 dark:text-green-200">
          Model loaded successfully. You can now use local inference.
        </p>
      </CardContent>
    </Card>
  );
};

export default ModelDownloadProgress;
