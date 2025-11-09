/**
 * VoiceInput Component
 *
 * A beautiful, seamless voice recording and transcription UI for journal entries.
 * Integrates Whisper transcription and shows real-time recording state with visual feedback.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { useServices } from '@/providers/ServiceProvider';

interface VoiceInputProps {
  /**
   * Callback when transcription completes
   */
  onTranscribed: (text: string) => void;
  /**
   * Optional CSS class for styling
   */
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

/**
 * VoiceInput component for capturing audio and transcribing with Whisper.
 * Provides smooth UX with visual feedback during recording and processing.
 *
 * @param onTranscribed - Callback called when transcription completes
 * @param className - Optional CSS classes
 */
export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscribed, className = '' }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { voiceTranscriptionService } = useServices();

  const startRecording = async () => {
    try {
      setErrorMessage('');
      setRecordingState('recording');
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          setRecordingState('processing');
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'recording.webm', {
            type: 'audio/webm',
          });

          // Transcribe the audio
          const result = await voiceTranscriptionService.transcribeFile(audioFile);

          if (result.success && result.text?.trim()) {
            setRecordingState('success');
            onTranscribed(result.text);

            // Reset after showing success state
            setTimeout(() => {
              setRecordingState('idle');
            }, 1500);
          } else {
            throw result.error || new Error('No speech detected');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Transcription failed';
          setErrorMessage(errorMsg);
          setRecordingState('error');

          setTimeout(() => {
            setRecordingState('idle');
          }, 2000);
        }

        // Stop audio stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Microphone access denied';
      setErrorMessage(errorMsg);
      setRecordingState('error');

      setTimeout(() => {
        setRecordingState('idle');
      }, 2000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {recordingState === 'idle' && (
        <Button
          size="sm"
          variant="outline"
          onClick={startRecording}
          className="gap-2"
          title="Click to start recording voice input"
        >
          <Mic className="h-4 w-4" />
          Voice
        </Button>
      )}

      {recordingState === 'recording' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-destructive bg-destructive/5">
            <span className="animate-pulse h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-destructive">Recording...</span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={stopRecording}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>
      )}

      {recordingState === 'processing' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <Loader className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Transcribing...
          </span>
        </div>
      )}

      {recordingState === 'success' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            Transcribed!
          </span>
        </div>
      )}

      {recordingState === 'error' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-destructive bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
