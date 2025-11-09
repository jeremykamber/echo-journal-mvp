import { transcribeFileViaServer as defaultTranscribe } from '@/clients/whisperClient';

export type VoiceTranscriptionService = {
    transcribeFile: (file: File) => Promise<{ success: boolean; text?: string; error?: Error | null }>;
};

export function makeVoiceTranscriptionService({ transcribeClient = defaultTranscribe }: { transcribeClient?: typeof defaultTranscribe } = {}): VoiceTranscriptionService {
    return {
        async transcribeFile(file: File) {
            return transcribeClient(file);
        }
    };
}

export default makeVoiceTranscriptionService;
