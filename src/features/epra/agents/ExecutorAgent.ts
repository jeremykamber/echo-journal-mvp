import { IEventRepository, ILLMClient, IContextRetrievalService } from '../domain/interfaces';
import { UUID } from '../domain/types';

export class ExecutorAgent {
  constructor(
    private eventRepository: IEventRepository,
    private llmClient: ILLMClient,
    private contextService: IContextRetrievalService
  ) { }

  /**
   * Executes a scheduled reflection event.
   */
  async execute(eventId: UUID): Promise<string> {
    // 1. Load Event
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // 2. Build Context (Dual RAG)
    const context = await this.contextService.getCombinedContext(
      event.source_journal_entry_id,
      event.related_journal_ids,
      event.related_chat_snippet_ids
    );

    // 3. Generate Message
    const systemPrompt = `You are a future version of Echo. You scheduled this reflection in the past. 
Draft a proactive, personalized message to send to the user right now.`;

    const userPrompt = `Historical Context:
${context}

Original Directive: ${event.ai_prompt}
Reasoning: ${event.reason || 'N/A'}

Generate the reflection message for the user based on this context.`;

    const message = await this.llmClient.generateCompletion(
      userPrompt,
      systemPrompt,
      'FAST'
    );

    // 4. Update Status
    await this.eventRepository.updateStatus(eventId, 'EXECUTED');

    return message;
  }
}
