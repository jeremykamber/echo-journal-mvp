import { sendMessage, streamMessage } from '../AIHelpers';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import * as webllmClient from '../../assets/clients/webllmClient';

beforeEach(() => {
  vi.spyOn(webllmClient, 'sendWebLLMMessage').mockImplementation(async (messages: any[]) => `Echo: ${messages[0].content}`);
  vi.spyOn(webllmClient, 'streamWebLLMMessage').mockImplementation(async function* (messages: any[]) {
    yield 'Echo: ' + messages[0].content;
  });
});

describe('AIContext (webLLM integration)', () => {
  it('should send a message via webLLM', async () => {
    const response = await sendMessage([{ role: 'user', content: 'Hello' }], 'webllm');
    expect(response).toEqual({ error: false, message: 'Echo: Hello' });
  });

  it('should stream a response via webLLM', async () => {
    const chunks: string[] = [];
    for await (const chunk of streamMessage([{ role: 'user', content: 'Stream' }], 'webllm')) {
    chunks.push(chunk.message);
    }
    expect(chunks[0]).toBe('Echo: Stream');
  });
});
