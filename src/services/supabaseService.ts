// src/services/supabaseService.ts

import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define schema type for reflection feedback
export interface ReflectionFeedback {
  id?: string;
  reflection_text: string;
  feedback_type: 'like' | 'dislike';
  reflection_type: 'chat-response' | 'realtime-reflection';
  created_at?: string;
}

/**
 * Submit feedback (like/dislike) for a reflection
 * 
 * @param reflectionText The full text of the reflection being rated
 * @param feedbackType Either 'like' or 'dislike'
 * @param reflectionType Type of reflection ('chat-response' or 'realtime-reflection')
 * @returns Result of the insertion operation
 */
export const submitReflectionFeedback = async (
  reflectionText: string,
  feedbackType: 'like' | 'dislike',
  reflectionType: 'chat-response' | 'realtime-reflection'
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Don't submit if environment variables aren't set up
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not configured, feedback submission skipped');
      // Return success anyway to avoid confusing users when developers haven't set up Supabase
      return { success: true, error: null };
    }
    
    // Limit the reflectionText length to avoid huge payloads
    // Truncate to 1000 chars if needed, keeping it reasonable for database storage
    const truncatedText = reflectionText.length > 1000 
      ? reflectionText.substring(0, 997) + '...' 
      : reflectionText;
    
    // Create a feedback record with the required fields
    const feedbackRecord: ReflectionFeedback = {
      reflection_text: truncatedText,
      feedback_type: feedbackType,
      reflection_type: reflectionType,
    };

    // Insert the record into the reflections_feedback table
    const { error } = await supabase
      .from('reflections_feedback')
      .insert([feedbackRecord]);

    if (error) {
      console.error('Error submitting reflection feedback:', error);
      return { success: false, error: new Error(`Supabase error: ${error.message}`) };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception when submitting reflection feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error occurred'),
    };
  }
};
