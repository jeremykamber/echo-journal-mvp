import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ServiceProvider } from '../../../providers/ServiceProvider';
import { getVoiceTranscriptionService } from '../../../services/voiceTranscriptionRegistry';

describe('voice transcription registry', () => {
    it('registers provider instance', () => {
        const { unmount } = render(
            <ServiceProvider>
                <div />
            </ServiceProvider>
        );

        const svc = getVoiceTranscriptionService();
        expect(svc).toBeDefined();
        expect(typeof svc?.transcribeFile).toBe('function');

        unmount();
    });
});
