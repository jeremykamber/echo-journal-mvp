import { describe, it, expect, vi } from 'vitest';
import { makeVoiceTranscriptionService } from '@/features/voice/services/voiceTranscriptionService';

describe('voiceTranscriptionService', () => {
    it('delegates to the client transcribe function', async () => {
        const mockClient = vi.fn(async () => ({ success: true, text: 'hello', error: null }));
        const svc = makeVoiceTranscriptionService({ transcribeClient: mockClient as any });

        const fakeFile = new File(['audio'], 'a.wav', { type: 'audio/wav' });
        const res = await svc.transcribeFile(fakeFile);
        expect(res.success).toBe(true);
        expect(res.text).toBe('hello');
        expect(mockClient).toHaveBeenCalled();
    });
});
