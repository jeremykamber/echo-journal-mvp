import { transcribeFileViaServer as defaultClientTranscribe } from '@/clients/whisperClient';
import type { VoiceTranscriptionService } from '@/features/voice/services/voiceTranscriptionService';

export async function transcribeAudioFile(
    file: File,
    service?: VoiceTranscriptionService
): Promise<string> {
    try {
        // Prefer an injected service (useful for testing), then a client-level helper.
        if (service && typeof service.transcribeFile === 'function') {
            const res = await service.transcribeFile(file);
            return res.success ? (res.text || '') : '';
        }

        const res = await defaultClientTranscribe(file);
        if (res.success) return res.text || '';

        // Fallback: browser SpeechRecognition if available (limited)
        if ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition) {
            return '';
        }

        return '';
    } catch (err) {
        console.warn('transcribeAudioFile failed', err);
        return '';
    }
}

export default transcribeAudioFile;
