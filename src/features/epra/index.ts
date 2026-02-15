import { SupabaseEventRepository } from './infrastructure/SupabaseEventRepository';
import { LlmClientAdapter } from './infrastructure/LlmClientAdapter';
import { VectorStoreAdapter } from './infrastructure/VectorStoreAdapter';
import { LocalCronClient } from './infrastructure/LocalCronClient';
import { SchedulingService } from './services/SchedulingService';
import { ContextRetrievalService } from './services/ContextRetrievalService';
import { AgentOrchestrator } from './agents/AgentOrchestrator';
import { ExecutorAgent } from './agents/ExecutorAgent';

// Singletons for the feature
const eventRepo = new SupabaseEventRepository();
const llmClient = new LlmClientAdapter();
const vectorStore = new VectorStoreAdapter();

export const cronClient = new LocalCronClient(async (eventId) => {
  await executorAgent.execute(eventId);
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
