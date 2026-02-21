import { ICronClient } from '../domain/interfaces';
import { UUID } from '../domain/types';

export class LocalCronClient implements ICronClient {
  private jobs = new Map<UUID, ReturnType<typeof setTimeout>>();

  constructor(private onExecute: (eventId: UUID) => Promise<void>) { }

  async scheduleJob(eventId: UUID, executeAt: Date): Promise<void> {
    const now = new Date();
    const delay = executeAt.getTime() - now.getTime();

    if (delay <= 0) {
      // Execute immediately if we missed it
      void this.onExecute(eventId);
      return;
    }

    const timer = setTimeout(() => {
      this.jobs.delete(eventId);
      void this.onExecute(eventId);
    }, delay);

    this.jobs.set(eventId, timer);
  }

  async cancelJob(eventId: UUID): Promise<void> {
    const timer = this.jobs.get(eventId);
    if (timer) {
      clearTimeout(timer);
      this.jobs.delete(eventId);
    }
  }
}
