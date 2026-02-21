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
Your job is to schedule future check-ins and identify complex patterns.

1. FUTURE REFLECTIONS: Schedule follow-ups or reflections.
2. INSIGHT REPORTS: If you detect a complex pattern, evolving goal, or emotional cycle across the entry and existing history, generate a process-map style report.

OUTPUT FORMAT: Return a JSON object with:
{
  "reflections": [{ "scheduled_for": "ISO", "ai_prompt": "string", "reason": "string" }],
  "report": { 
     "title": "string", 
     "summary": "string", 
     "nodes": [{ "id": "string", "title": "string", "description": "string", "type": "emotion|concept|action|milestone", "source_journal_ids": ["uuid"] }],
     "edges": [{ "from": "id", "to": "id", "label": "string" }]
  } | null
}`;

    const userPrompt = `Review this journal entry. 
Plan future reflections and/or generate a process-map report if a deep pattern is found.

Journal Entry:
${entryText}

Existing Pending Events:
${pendingContext || 'None'}

Output ONLY the JSON object.`;

    const response = await this.llmClient.generateCompletion(
      userPrompt,
      systemPrompt,
      'REASONING'
    );

    try {
      const output: { reflections: any[], report?: any } = JSON.parse(response);

      // 1. Save Reflections
      for (const eventData of output.reflections || []) {
        await this.schedulingService.schedule({
          user_id: userId,
          status: 'PENDING',
          scheduled_for: eventData.scheduled_for,
          ai_prompt: eventData.ai_prompt,
          reason: eventData.reason,
          source_journal_entry_id: entryId,
          related_journal_ids: [],
          related_chat_snippet_ids: []
        });
      }

      // 2. Save Report if generated
      if (output.report) {
        await this.eventRepository.saveReport({
          user_id: userId,
          title: output.report.title,
          summary: output.report.summary,
          nodes: output.report.nodes,
          edges: output.report.edges,
          source_entry_ids: [entryId] // Orchestrator usually focuses on current entry + context
        });
      }
    } catch (error) {
      console.error('Failed to parse Orchestrator LLM output:', error);
      // In a production system, we might retry or log to an error monitoring service.
    }
  }
}
