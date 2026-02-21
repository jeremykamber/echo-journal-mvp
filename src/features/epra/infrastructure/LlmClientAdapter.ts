import { ILLMClient } from '../domain/interfaces';
import { getGlobalLLMProvider } from '@/services/llmProviders/adapterService';
import { ChatMessage } from '@/services/llmProviders/interface';

export class LlmClientAdapter implements ILLMClient {
  async generateCompletion(prompt: string, systemContext: string, modelType: 'REASONING' | 'FAST'): Promise<string> {
    const provider = getGlobalLLMProvider();
    if (!provider) throw new Error('LLM Provider not initialized');

    const messages: ChatMessage[] = [
      { role: 'system', content: systemContext },
      { role: 'user', content: prompt }
    ];

    let response = '';
    // Note: adapterService usually streams, we'll buffer it for the agents
    for await (const chunk of provider.streamChatCompletion({ messages })) {
      response += chunk;
    }

    return response;
  }

  async summarize(text: string): Promise<string> {
    const systemContext = "Summarize the following historical context for a journaling AI. Keep the most important emotional patterns and facts.";
    return this.generateCompletion(text, systemContext, 'FAST');
  }
}
