import { UUID, ScheduledReflectionEvent } from './types';

export interface ICronClient {
  scheduleJob(eventId: UUID, executeAt: Date): Promise<void>;
  cancelJob(eventId: UUID): Promise<void>;
}

export interface IEventRepository {
  create(event: Omit<ScheduledReflectionEvent, 'id' | 'created_at'>): Promise<ScheduledReflectionEvent>;
  findById(id: UUID): Promise<ScheduledReflectionEvent | null>;
  findPendingByUser(userId: UUID): Promise<ScheduledReflectionEvent[]>;
  updateStatus(id: UUID, status: 'EXECUTED' | 'CANCELLED'): Promise<void>;
}

export interface ILLMClient {
  generateCompletion(prompt: string, systemContext: string, modelType: 'REASONING' | 'FAST'): Promise<string>;
}
