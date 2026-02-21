import { ICronClient, IEventRepository } from '../domain/interfaces';
import { ScheduledReflectionEvent } from '../domain/types';

export class SchedulingService {
  constructor(
    private eventRepository: IEventRepository,
    private cronClient: ICronClient
  ) { }

  /**
   * Schedules a new reflection event.
   * Validates that the date is in the future, persists to DB, and registers with Cron.
   */
  async schedule(eventData: Omit<ScheduledReflectionEvent, 'id' | 'created_at'>): Promise<ScheduledReflectionEvent> {
    const scheduledDate = new Date(eventData.scheduled_for);
    const now = new Date();

    if (scheduledDate <= now) {
      throw new Error('Cannot schedule a reflection in the past');
    }

    // 1. Persist to Repository
    const savedEvent = await this.eventRepository.create(eventData);

    // 2. Schedule via Cron Client
    await this.cronClient.scheduleJob(savedEvent.id, scheduledDate);

    return savedEvent;
  }

  async cancel(eventId: string): Promise<void> {
    await this.cronClient.cancelJob(eventId);
    await this.eventRepository.updateStatus(eventId, 'CANCELLED');
  }
}
