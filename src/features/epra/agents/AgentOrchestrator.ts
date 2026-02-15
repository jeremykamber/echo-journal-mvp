import { IEventRepository, ILLMClient } from '../domain/interfaces';
import { SchedulingService } from '../services/SchedulingService';
import { UUID } from '../domain/types';

export class AgentOrchestrator {
  constructor(
    private eventRepository: IEventRepository,
    private llmClient: ILLMClient,
    private schedulingService: SchedulingService
  ) { }

  /**
   * Post-session orchestration. Plans future reflections.
   */
  async orchestrate(userId: UUID, entryId: UUID, entryText: string): Promise<void> {
    // 1. Fetch existing pending events for deduplication context
    const pendingEvents = await this.eventRepository.findPendingByUser(userId);
    const pendingContext = pendingEvents.map(e => `- Prompt: ${e.ai_prompt} (Reason: ${e.reason})`).join('\n');

    const systemPrompt = `You are Echo, sitting at your desk reflecting on the user's recent journal entry. 
Your job is to schedule future check-ins. 
Review the provided journal entry and the existing pending events. 
Do not duplicate existing pending check-ins.
OUTPUT FORMAT: Return a JSON array of new objects to schedule.`;

    const userPrompt = `Plan future reflections based on this journal entry. 

Journal Entry:
${entryText}

Existing Pending Events:
${pendingContext || 'None'}

Output ONLY the JSON array.`;

    const response = await this.llmClient.generateCompletion(
      userPrompt,
      systemPrompt,
      'REASONING'
    );

    try {
      const newEvents: any[] = JSON.parse(response);
      for (const eventData of newEvents) {
        await this.schedulingService.schedule({
          user_id: userId,
          status: 'PENDING',
          scheduled_for: eventData.scheduled_for,
          ai_prompt: eventData.ai_prompt,
          reason: eventData.reason,
          source_journal_entry_id: entryId,
          related_journal_ids: [], // To be populated if needed
          related_chat_snippet_ids: []
        });
      }
    } catch (error) {
      console.error('Failed to parse Orchestrator LLM output:', error);
      // In a production system, we might retry or log to an error monitoring service.
    }
  }
}
