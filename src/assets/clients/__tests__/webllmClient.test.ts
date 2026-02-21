import { describe, it, expect } from 'vitest';
import { sendWebLLMMessage, streamWebLLMMessage } from '../webllmClient';

describe('webllmClient', () => {
  it('should send a message and receive a response', async () => {
    // Mock implementation or use a test endpoint
    const response = await sendWebLLMMessage([{ role: 'user', content: 'Hello' }]);
    expect(response).toBeTypeOf('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('should stream a response', async () => {
    const chunks: string[] = [];
    for await (const chunk of streamWebLLMMessage([{ role: 'user', content: 'Stream this' }])) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toBeTypeOf('string');
  });
});
