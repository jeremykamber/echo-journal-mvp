import { sendWebLLMMessage, streamWebLLMMessage } from '@/assets/clients/webllmClient';
import { ChatMessage } from '@/services/llmProviders/interface';

export type AIBackend = 'default' | 'webllm';

export const sendMessage = async (messages: ChatMessage[], backend: AIBackend = 'default') => {
  if (backend === 'webllm') {
    const result = await sendWebLLMMessage(messages);
    if (result.startsWith('Error:')) {
      return { error: true, message: result };
    }
    return { error: false, message: result };
  }
  // ...other backends...
  return { error: false, message: '' };
};

export async function* streamMessage(messages: ChatMessage[], backend: AIBackend = 'default') {
  if (backend === 'webllm') {
    for await (const chunk of streamWebLLMMessage(messages)) {
      if (chunk.startsWith('Error:')) {
        yield { error: true, message: chunk };
        return;
      }
      yield { error: false, message: chunk };
    }
    return;
  }
  // ...other backends...
  return;
}
