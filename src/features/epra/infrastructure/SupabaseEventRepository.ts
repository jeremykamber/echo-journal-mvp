import { supabase } from '@/clients/supabaseClient';
import { IEventRepository } from '../domain/interfaces';
import { ScheduledReflectionEvent, UUID, InsightReport } from '../domain/types';

export class SupabaseEventRepository implements IEventRepository {
  private readonly TABLE = 'scheduled_reflection_events';

  async create(event: Omit<ScheduledReflectionEvent, 'id' | 'created_at'>): Promise<ScheduledReflectionEvent> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .insert([event])
      .select()
      .single();

    if (error) throw new Error(`Failed to create event: ${error.message}`);
    return data as ScheduledReflectionEvent;
  }

  async findById(id: UUID): Promise<ScheduledReflectionEvent | null> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find event: ${error.message}`);
    }
    return data as ScheduledReflectionEvent;
  }

  async findPendingByUser(userId: UUID): Promise<ScheduledReflectionEvent[]> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'PENDING');

    if (error) throw new Error(`Failed to fetch pending events: ${error.message}`);
    return data as ScheduledReflectionEvent[];
  }

  async updateStatus(id: UUID, status: 'EXECUTED' | 'CANCELLED'): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE)
      .update({ status })
      .eq('id', id);

    if (error) throw new Error(`Failed to update event status: ${error.message}`);
  }

  async saveReport(report: Omit<InsightReport, 'id' | 'created_at'>): Promise<InsightReport> {
    const { data, error } = await supabase
      .from('insight_reports')
      .insert([report])
      .select()
      .single();

    if (error) throw new Error(`Failed to save report: ${error.message}`);
    return data as InsightReport;
  }

  async fetchReportsByUser(userId: UUID): Promise<InsightReport[]> {
    const { data, error } = await supabase
      .from('insight_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
    return data as InsightReport[];
  }
}
