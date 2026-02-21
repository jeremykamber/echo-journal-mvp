import { UUID, ScheduledReflectionEvent, InsightReport } from './types';

export interface ICronClient {
  scheduleJob(eventId: UUID, executeAt: Date): Promise<void>;
  cancelJob(eventId: UUID): Promise<void>;
}

export interface IEventRepository {
  create(event: Omit<ScheduledReflectionEvent, 'id' | 'created_at'>): Promise<ScheduledReflectionEvent>;
  findById(id: UUID): Promise<ScheduledReflectionEvent | null>;
  findPendingByUser(userId: UUID): Promise<ScheduledReflectionEvent[]>;
  updateStatus(id: UUID, status: 'EXECUTED' | 'CANCELLED'): Promise<void>;

  // Reporting
  saveReport(report: Omit<InsightReport, 'id' | 'created_at'>): Promise<InsightReport>;
  fetchReportsByUser(userId: UUID): Promise<InsightReport[]>;
}

export interface ILLMClient {
  generateCompletion(prompt: string, systemContext: string, modelType: 'REASONING' | 'FAST'): Promise<string>;
  summarize(text: string): Promise<string>;
}

export interface IVectorStore {
  fetchRelated(id: UUID, limit: number, type: 'JOURNAL' | 'CHAT'): Promise<string[]>;
}

export interface IContextRetrievalService {
  getCombinedContext(
    journalId: UUID,
    relatedJournalIds: UUID[],
    relatedChatIds: UUID[]
  ): Promise<string>;
}
