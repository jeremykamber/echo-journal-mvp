import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Create a dedicated Supabase client for the clients layer. This intentionally mirrors
// the existing top-level supabase instance for now — we'll consolidate later.
const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '');

export interface AppFeedbackPayload {
  emoji_rating: string;
  additional_feedback?: string;
  user_id?: string;
  session_id?: string;
}

export const insertAppFeedback = async (
  payload: AppFeedbackPayload
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      // When env is not configured (dev/test) we return success to avoid
      // surfacing platform errors to end users during local development.
      console.warn('Supabase environment not configured; insertAppFeedback skipped');
      return { success: true, error: null };
    }

    const { error } = await supabaseClient.from('app_feedback').insert([payload]);
    if (error) return { success: false, error: new Error(error.message) };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
};

// Export the low-level supabase instance so other service modules can import
// and reuse it instead of creating independent clients.
export const supabase = supabaseClient;
