import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeFileViaServer } from '@/clients/whisperClient';

describe('whisperClient', () => {
    const origFetch = globalThis.fetch;

    beforeEach(() => {
        // @ts-ignore
        globalThis.fetch = vi.fn();
    });
    afterEach(() => {
        globalThis.fetch = origFetch;
    });

    it('sends base64 JSON to /api/whisper and parses response', async () => {
        const fakeResponse = { ok: true, json: async () => ({ text: 'hello' }) } as any;
        // @ts-ignore
        globalThis.fetch.mockResolvedValue(fakeResponse);

        const fakeFile = new File(['hi'], 'a.wav', { type: 'audio/wav' });

        const res = await transcribeFileViaServer(fakeFile);
        expect(res.success).toBe(true);
        expect(res.text).toBe('hello');
        // Ensure fetch was called with JSON body
        // @ts-ignore
        const calledWith = globalThis.fetch.mock.calls[0];
        const url = calledWith[0];
        const opts = calledWith[1];
        expect(url).toBe('/api/whisper');
        expect(opts.method).toBe('POST');
        expect(opts.headers['Content-Type']).toBe('application/json');
    });
});
