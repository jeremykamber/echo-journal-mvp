import React, { useState } from 'react';
import transcribeAudioFile from '@/features/memory/hooks/useWhisper';
import { Button } from '@/components/ui/button';
import { useServices } from '@/providers/ServiceProvider';

export const AudioCapture: React.FC<{ onTranscribed: (text: string) => void }> = ({ onTranscribed }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const { voiceTranscriptionService } = useServices();

    const handleFile = (f?: File) => {
        if (!f) return;
        setFile(f);
    };

    const handleTranscribe = async () => {
        if (!file) return;
        setIsTranscribing(true);
        try {
            const text = await transcribeAudioFile(file, voiceTranscriptionService);
            onTranscribed(text);
        } catch (err) {
            console.warn('transcription failed', err);
        } finally {
            setIsTranscribing(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input aria-label="audio-upload" type="file" accept="audio/*" onChange={(e) => handleFile(e.target.files?.[0])} />
            <Button size="sm" onClick={handleTranscribe} disabled={!file || isTranscribing}>{isTranscribing ? 'Transcribing…' : 'Transcribe'}</Button>
        </div>
    );
};

export default AudioCapture;
