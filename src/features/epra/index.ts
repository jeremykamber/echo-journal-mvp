import { SupabaseEventRepository } from './infrastructure/SupabaseEventRepository';
import { LlmClientAdapter } from './infrastructure/LlmClientAdapter';
import { VectorStoreAdapter } from './infrastructure/VectorStoreAdapter';
import { LocalCronClient } from './infrastructure/LocalCronClient';
import { SchedulingService } from './services/SchedulingService';
import { ContextRetrievalService } from './services/ContextRetrievalService';
import { AgentOrchestrator } from './agents/AgentOrchestrator';
import { ExecutorAgent } from './agents/ExecutorAgent';

import useJournalStore from '@/store/journalStore';
import { toast } from 'sonner';

// Singletons for the feature
const eventRepo = new SupabaseEventRepository();
const llmClient = new LlmClientAdapter();
const vectorStore = new VectorStoreAdapter();

export const cronClient = new LocalCronClient(async (eventId) => {
  const messageText = await executorAgent.execute(eventId);

  if (messageText) {
    const event = await eventRepo.findById(eventId);
    if (event) {
      // 1. Inject into useJournalStore
      const { addMessage } = useJournalStore.getState();
      addMessage(
        'ai',
        messageText,
        `entry-${event.source_journal_entry_id}-future`, // Unique thread for future reflections
        event.source_journal_entry_id
      );

      // 2. Trigger Pulse Toast
      toast('New Reflection Received', {
        description: "A proactive thought from 'Future Echo' has been added to your journal.",
        action: {
          label: 'View',
          onClick: () => {
            // Navigation logic could go here
          }
        }
      });
    }
  }
});

export const schedulingService = new SchedulingService(eventRepo, cronClient);
export const contextService = new ContextRetrievalService(vectorStore, llmClient);

export const agentOrchestrator = new AgentOrchestrator(
  eventRepo,
  llmClient,
  schedulingService
);

export const executorAgent = new ExecutorAgent(
  eventRepo,
  llmClient,
  contextService
);
