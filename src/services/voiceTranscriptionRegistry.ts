import type { VoiceTranscriptionService } from '@/features/voice/services/voiceTranscriptionService';

let _svc: VoiceTranscriptionService | null = null;

export function setVoiceTranscriptionService(svc: VoiceTranscriptionService) {
    _svc = svc;
}

export function getVoiceTranscriptionService(): VoiceTranscriptionService | null {
    return _svc;
}

export default getVoiceTranscriptionService;
