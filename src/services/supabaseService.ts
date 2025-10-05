// =============================================
// Stash Feature: Backend API
// =============================================

export type StashSourceType = 'journal' | 'conversation';

export interface StashItem {
  stashItemId: string;
  userId: string;
  reflectionText: string;
  sourceType: StashSourceType;
  sourceId: string;
  sourceTitleOrDate: string;
  createdAt: string; // when the reflection was originally written
  stashedAt: string; // when it was stashed
}

/**
 * Stash a reflection for the current user
 * @param params All required stash fields except stashItemId/userId/stashedAt
 */
export const stashReflection = async (params: {
  reflectionText: string;
  sourceType: StashSourceType;
  sourceId: string;
  sourceTitleOrDate: string;
  createdAt: string;
}): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: new Error('Not authenticated') };
    const { error } = await supabase.from('stash').insert([
      {
        user_id: user.id,
        reflection_text: params.reflectionText,
        source_type: params.sourceType,
        source_id: params.sourceId,
        source_title_or_date: params.sourceTitleOrDate,
        created_at: params.createdAt,
        stashed_at: new Date().toISOString(),
      }
    ]);
    if (error) return { success: false, error };
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
  }
};

/**
 * Get all stashed reflections for the current user
 */
export const getStash = async (): Promise<{ items: StashItem[]; error: Error | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { items: [], error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('stash')
      .select('*')
      .eq('user_id', user.id)
      .order('stashed_at', { ascending: false });
    if (error) return { items: [], error };
    // Map DB fields to StashItem
    const items: StashItem[] = (data || []).map((row: any) => ({
      stashItemId: row.id,
      userId: row.user_id,
      reflectionText: row.reflection_text,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceTitleOrDate: row.source_title_or_date,
      createdAt: row.created_at,
      stashedAt: row.stashed_at,
    }));
    return { items, error: null };
  } catch (error) {
    return { items: [], error: error instanceof Error ? error : new Error('Unknown error') };
  }
};

/**
 * Remove a stashed reflection (unstash)
 */
export const unstashReflection = async (stashItemId: string): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: new Error('Not authenticated') };
    const { error } = await supabase.from('stash').delete().eq('id', stashItemId).eq('user_id', user.id);
    if (error) return { success: false, error };
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
  }
};

/**
 * Get the count of stashed reflections for the current user
 */
export const getStashCount = async (): Promise<{ count: number; error: Error | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0, error: new Error('Not authenticated') };
    const { count, error } = await supabase
      .from('stash')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (error) return { count: 0, error };
    return { count: count || 0, error: null };
  } catch (error) {
    return { count: 0, error: error instanceof Error ? error : new Error('Unknown error') };
  }
};
// src/services/supabaseService.ts

import { createClient, User } from '@supabase/supabase-js';
import { AppSettings } from '@/store/settingsStore';
import { JournalEntry, Message } from '@/store/journalStore';
import { Conversation } from '@/store/conversationStore';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define schema types 
export interface ReflectionFeedback {
  id?: string;
  reflection_text: string;
  feedback_type: 'like' | 'dislike';
  reflection_type: 'chat-response' | 'realtime-reflection';
  created_at?: string;
  user_id?: string;
}

// New interface for app user satisfaction feedback
export interface AppFeedback {
  id?: string;
  user_id?: string;
  emoji_rating: string; // "😃", "🙂", "😐", "😞"
  additional_feedback?: string; // Text feedback for negative ratings
  created_at?: string;
  session_id?: string; // Optional: track which session this feedback is from
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  is_beta_user: boolean;
  created_at: string;
  last_seen_at: string;
  avatar_url?: string;
}

// Error type for handling errors across service
export class SupabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'SupabaseError';
  }
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
      : reflectionText; // TODO: consider using a more sophisticated truncation method if needed––WATCH OUT FOR THIS

    // Get the current user ID if available
    const { data: { user } } = await supabase.auth.getUser();

    // Create a feedback record with the required fields
    const feedbackRecord: ReflectionFeedback = {
      reflection_text: truncatedText,
      feedback_type: feedbackType,
      reflection_type: reflectionType,
      user_id: user?.id, // May be undefined for anonymous users
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

/**
 * Submit app satisfaction feedback with emoji rating
 * 
 * @param emojiRating The emoji selected by the user (😃, 🙂, 😐, 😞)
 * @param additionalFeedback Optional text feedback for negative ratings
 * @returns Result of the insertion operation
 */
export const submitAppFeedback = async (
  emojiRating: string,
  additionalFeedback?: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Don't submit if environment variables aren't set up
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not configured, feedback submission skipped');
      // Return success anyway to avoid confusing users when developers haven't set up Supabase
      return { success: true, error: null };
    }

    // Get the current user ID if available
    const { data: { user } } = await supabase.auth.getUser();

    // Generate a session ID if not exists (helps track feedback from same session)
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    }
    const sessionId = localStorage.getItem('sessionId');

    // Create a feedback record
    const feedbackRecord: AppFeedback = {
      emoji_rating: emojiRating,
      additional_feedback: additionalFeedback,
      user_id: user?.id, // May be undefined for anonymous users
      session_id: sessionId || undefined
    };

    // Insert into a new app_feedback table
    const { error } = await supabase
      .from('app_feedback')
      .insert([feedbackRecord]);

    if (error) {
      console.error('Error submitting app feedback:', error);
      return { success: false, error: new Error(`Supabase error: ${error.message}`) };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception when submitting app feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error occurred'),
    };
  }
};

// =============================================
// Authentication and User Management Functions
// =============================================

/**
 * Register a new user with email and password
 * 
 * @param email User's email address
 * @param password User's password
 * @param name User's name
 * @param isBetaUser Whether this user is a beta tester
 * @returns The newly created user
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string,
  isBetaUser: boolean = false
): Promise<{ user: User | null; error: SupabaseError | null }> => {
  try {
    // Register the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          is_beta_user: isBetaUser
        }
      }
    });

    if (authError) throw new SupabaseError('Registration failed', authError);
    if (!authData.user) throw new SupabaseError('Registration succeeded but no user returned');

    // Create a profile record in the users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        email,
        name,
        is_beta_user: isBetaUser
      }]);

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // We'll continue anyway since the auth user was created
    }

    // Initialize user settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert([{ user_id: authData.user.id }]);

    if (settingsError) {
      console.error('Error creating user settings:', settingsError);
      // Continue anyway
    }

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Exception during user registration:', error);
    return {
      user: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Registration failed',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Login with email and password
 * 
 * @param email User's email
 * @param password User's password
 * @returns The authenticated user or error
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<{ user: User | null; error: SupabaseError | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw new SupabaseError('Login failed', error);
    if (!data.user) throw new SupabaseError('Login succeeded but no user returned');

    // Update last seen time
    await updateLastSeen(data.user.id);

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Exception during login:', error);
    return {
      user: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Login failed',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Login with Google OAuth
 * 
 * @returns Redirect to Google OAuth login
 */
export const loginWithGoogle = async (): Promise<void> => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};

/**
 * Log out the current user
 * 
 * @returns Success status or error
 */
export const logout = async (): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw new SupabaseError('Logout failed', error);

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception during logout:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Logout failed',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Get the current authenticated user
 * 
 * @returns Current user or null
 */
export const getCurrentUser = async (): Promise<{ user: User | null; error: SupabaseError | null }> => {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) throw new SupabaseError('Failed to get current user', error);

    // If we have a user, update their last seen time
    if (data.user) {
      await updateLastSeen(data.user.id);
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Exception getting current user:', error);
    return {
      user: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to get current user',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Get the user's profile data
 * 
 * @param userId User ID (optional, defaults to current user)
 * @returns User profile data
 */
export const getUserProfile = async (
  userId?: string
): Promise<{ profile: UserProfile | null; error: SupabaseError | null }> => {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    }

    // If still no userId, return null
    if (!userId) {
      return { profile: null, error: new SupabaseError('No user ID provided and no current user') };
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new SupabaseError('Failed to get user profile', error);
    if (!data) throw new SupabaseError('User profile not found');

    return { profile: data as UserProfile, error: null };
  } catch (error) {
    console.error('Exception getting user profile:', error);
    return {
      profile: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to get user profile',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Update the user's last seen timestamp
 * 
 * @param userId User's ID
 */
export const updateLastSeen = async (userId: string): Promise<void> => {
  try {
    await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to update last_seen_at:', error);
    // Non-critical error, so we just log it and continue
  }
};

/**
 * Update user profile data
 * 
 * @param userId User ID
 * @param profileData Updated profile data
 * @returns Success status or error
 */
export const updateUserProfile = async (
  userId: string,
  profileData: Partial<UserProfile>
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Don't allow updating id, created_at, or email (requires special auth flow)
    const safeUpdate = { ...profileData };
    delete safeUpdate.id;
    delete safeUpdate.created_at;
    delete safeUpdate.email;

    const { error } = await supabase
      .from('users')
      .update(safeUpdate)
      .eq('id', userId);

    if (error) throw new SupabaseError('Failed to update profile', error);

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception updating user profile:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to update profile',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

// =============================================
// Journal Entry Management
// =============================================

/**
 * Create a journal entry in the database
 * 
 * @param entry Journal entry object
 * @returns The created entry with server ID
 */
export const createJournalEntry = async (
  entry: Omit<JournalEntry, 'id'> & { id?: string }
): Promise<{ entry: JournalEntry | null; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Prepare entry data
    const entryData = {
      user_id: user.id,
      title: entry.title,
      content: entry.content,
      date: entry.date,
      external_id: entry.id // Store client-side ID as external_id
    };

    // Insert entry
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) throw new SupabaseError('Failed to create journal entry', error);
    if (!data) throw new SupabaseError('Entry creation succeeded but no entry returned');

    // Map the returned entry to match the app's JournalEntry format
    const createdEntry: JournalEntry = {
      id: entry.id || data.id, // Use the original client ID if available
      title: data.title,
      content: data.content,
      date: data.date,
      chatId: entry.chatId
    };

    return { entry: createdEntry, error: null };
  } catch (error) {
    console.error('Exception creating journal entry:', error);
    return {
      entry: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to create journal entry',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Get all journal entries for the current user
 * 
 * @returns Array of journal entries
 */
export const getUserJournalEntries = async (): Promise<{ entries: JournalEntry[]; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get entries
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw new SupabaseError('Failed to fetch journal entries', error);

    // Map to app's JournalEntry format
    const entries: JournalEntry[] = data.map(entry => ({
      id: entry.external_id || entry.id, // Prefer client ID if available
      title: entry.title,
      content: entry.content,
      date: entry.date,
      // We'll need to fetch chatId separately or via a join
    }));

    return { entries, error: null };
  } catch (error) {
    console.error('Exception getting journal entries:', error);
    return {
      entries: [],
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to get journal entries',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Update a journal entry
 * 
 * @param entry The entry to update
 * @returns Updated entry or error
 */
export const updateJournalEntry = async (
  entry: JournalEntry
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Find the entry by external_id
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('external_id', entry.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw new SupabaseError('Failed to find journal entry', fetchError);
    if (!existingEntry) throw new SupabaseError('Entry not found');

    // Update the entry
    const { error } = await supabase
      .from('journal_entries')
      .update({
        title: entry.title,
        content: entry.content,
        date: entry.date,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingEntry.id);

    if (error) throw new SupabaseError('Failed to update journal entry', error);

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception updating journal entry:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to update journal entry',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Delete a journal entry
 * 
 * @param entryId ID of the entry to delete
 * @returns Success status or error
 */
export const deleteJournalEntry = async (
  entryId: string
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Find the entry by external_id
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('external_id', entryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      // If not found by external_id, try direct id
      const { data: directEntry, error: directFetchError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('id', entryId)
        .eq('user_id', user.id)
        .single();

      if (directFetchError) throw new SupabaseError('Failed to find journal entry', directFetchError);
      if (!directEntry) throw new SupabaseError('Entry not found');

      // Delete the direct entry
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', directEntry.id);

      if (error) throw new SupabaseError('Failed to delete journal entry', error);
    } else {
      // Delete the entry found by external_id
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', existingEntry.id);

      if (error) throw new SupabaseError('Failed to delete journal entry', error);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception deleting journal entry:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to delete journal entry',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

// =============================================
// Chat/Thread Management
// =============================================

/**
 * Create a thread (conversation)
 * 
 * @param thread Thread data
 * @returns Created thread
 */
export const createThread = async (
  thread: Partial<Conversation> & { entryId?: string }
): Promise<{ thread: Conversation | null; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get journal entry DB id if provided
    let journalEntryDbId: string | null = null;
    if (thread.entryId) {
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('external_id', thread.entryId)
        .eq('user_id', user.id)
        .single();

      if (entry) {
        journalEntryDbId = entry.id;
      }
    }

    // Create thread
    const threadData = {
      user_id: user.id,
      title: thread.title || 'New Conversation',
      is_global: !thread.entryId,
      journal_entry_id: journalEntryDbId,
      external_id: thread.id, // Store the client-side ID
      created_at: thread.date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('threads')
      .insert([threadData])
      .select()
      .single();

    if (error) throw new SupabaseError('Failed to create thread', error);
    if (!data) throw new SupabaseError('Thread creation succeeded but no thread returned');

    // Map to app's Conversation format
    const createdThread: Conversation = {
      id: thread.id || data.id,
      title: data.title,
      date: data.created_at,
      lastMessage: undefined,
      isGlobal: data.is_global
    };

    return { thread: createdThread, error: null };
  } catch (error) {
    console.error('Exception creating thread:', error);
    return {
      thread: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to create thread',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Get all threads/conversations for the current user
 * 
 * @returns Array of conversations
 */
export const getUserThreads = async (): Promise<{ threads: Conversation[]; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get threads
    const { data, error } = await supabase
      .from('threads')
      .select(`
        *,
        messages:messages(*, created_at)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw new SupabaseError('Failed to fetch threads', error);

    // Map to app's Conversation format
    const threads: Conversation[] = data.map(thread => {
      // Find the latest message text for lastMessage
      let lastMessage: string | undefined;
      if (thread.messages && thread.messages.length > 0) {
        // Sort by timestamp and get the latest
        const latestMessage = [...thread.messages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        lastMessage = latestMessage.text;
      }

      return {
        id: thread.external_id || thread.id,
        title: thread.title,
        date: thread.created_at,
        lastMessage,
        isGlobal: thread.is_global
      };
    });

    return { threads, error: null };
  } catch (error) {
    console.error('Exception getting threads:', error);
    return {
      threads: [],
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to get threads',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Update a thread/conversation
 * 
 * @param threadId ID of the thread to update
 * @param updates Updates to apply
 * @returns Success status
 */
export const updateThread = async (
  threadId: string,
  updates: Partial<Conversation>
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Find the thread by external_id
    const { data: existingThread, error: fetchError } = await supabase
      .from('threads')
      .select('id')
      .eq('external_id', threadId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw new SupabaseError('Failed to find thread', fetchError);
    if (!existingThread) throw new SupabaseError('Thread not found');

    // Update the thread
    const { error } = await supabase
      .from('threads')
      .update({
        title: updates.title,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingThread.id);

    if (error) throw new SupabaseError('Failed to update thread', error);

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception updating thread:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to update thread',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Delete a thread/conversation
 * 
 * @param threadId ID of the thread to delete
 * @returns Success status
 */
export const deleteThread = async (
  threadId: string
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Find the thread by external_id
    const { data: existingThread, error: fetchError } = await supabase
      .from('threads')
      .select('id')
      .eq('external_id', threadId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      // If not found by external_id, try direct id
      const { data: directThread, error: directFetchError } = await supabase
        .from('threads')
        .select('id')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .single();

      if (directFetchError) throw new SupabaseError('Failed to find thread', directFetchError);
      if (!directThread) throw new SupabaseError('Thread not found');

      // Delete the direct thread
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', directThread.id);

      if (error) throw new SupabaseError('Failed to delete thread', error);
    } else {
      // Delete the thread found by external_id
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', existingThread.id);

      if (error) throw new SupabaseError('Failed to delete thread', error);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception deleting thread:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to delete thread',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

// =============================================
// Message Management
// =============================================

/**
 * Add a message to a thread
 * 
 * @param message Message to add
 * @returns Created message
 */
export const addMessage = async (
  message: Omit<Message, 'messageId'> & { messageId?: string; threadId: string }
): Promise<{ message: Message | null; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get thread DB id
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id')
      .eq('external_id', message.threadId)
      .eq('user_id', user.id)
      .single();

    if (threadError || !thread) throw new SupabaseError('Thread not found');

    // Get journal entry DB id if provided
    let journalEntryDbId: string | null = null;
    if (message.entryId) {
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('external_id', message.entryId)
        .eq('user_id', user.id)
        .single();

      if (entry) {
        journalEntryDbId = entry.id;
      }
    }

    // Add message
    const messageData = {
      thread_id: thread.id,
      sender: message.sender,
      text: message.text,
      journal_entry_id: journalEntryDbId,
      is_realtime_reflection: message.isRealtimeReflection || false,
      reflected_content: message.reflectedContent,
      is_read: message.isRead || false,
      created_at: message.timestamp || new Date().toISOString(),
      external_id: message.messageId
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select()
      .single();

    if (error) throw new SupabaseError('Failed to add message', error);
    if (!data) throw new SupabaseError('Message creation succeeded but no message returned');

    // Update thread's updated_at
    await supabase
      .from('threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', thread.id);

    // Map to app's Message format
    const createdMessage: Message = {
      messageId: message.messageId || data.id,
      sender: data.sender,
      text: data.text,
      entryId: message.entryId,
      timestamp: data.created_at,
      threadId: message.threadId,
      isRealtimeReflection: data.is_realtime_reflection,
      reflectedContent: data.reflected_content,
      isRead: data.is_read
    };

    return { message: createdMessage, error: null };
  } catch (error) {
    console.error('Exception adding message:', error);
    return {
      message: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to add message',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Get messages for a specific thread
 * 
 * @param threadId Thread ID
 * @returns Array of messages
 */
export const getMessagesForThread = async (
  threadId: string
): Promise<{ messages: Message[]; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get thread DB id
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id')
      .eq('external_id', threadId)
      .eq('user_id', user.id)
      .single();

    if (threadError || !thread) throw new SupabaseError('Thread not found');

    // Get messages
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        journal_entry:journal_entries(external_id)
      `)
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (error) throw new SupabaseError('Failed to fetch messages', error);

    // Map to app's Message format
    const messages: Message[] = data.map(msg => ({
      messageId: msg.external_id || msg.id,
      sender: msg.sender,
      text: msg.text,
      entryId: msg.journal_entry?.external_id,
      timestamp: msg.created_at,
      threadId,
      isRealtimeReflection: msg.is_realtime_reflection,
      reflectedContent: msg.reflected_content,
      isRead: msg.is_read
    }));

    return { messages, error: null };
  } catch (error) {
    console.error('Exception getting messages:', error);
    return {
      messages: [],
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to get messages',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Update a message
 * 
 * @param messageId Message ID
 * @param updates Updates to apply
 * @returns Success status
 */
export const updateMessage = async (
  messageId: string,
  updates: Partial<Message>
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Find the message by external_id
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('id, thread_id, threads!inner(user_id)')
      .eq('external_id', messageId)
      .eq('threads.user_id', user.id)
      .single();

    if (fetchError) throw new SupabaseError('Failed to find message', fetchError);
    if (!existingMessage) throw new SupabaseError('Message not found or access denied');

    // Update allowed fields
    const updateData: any = {};
    if (updates.text !== undefined) updateData.text = updates.text;
    if (updates.isRead !== undefined) updateData.is_read = updates.isRead;

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', existingMessage.id);

      if (error) throw new SupabaseError('Failed to update message', error);

      // If updating text, also update thread's updated_at
      if (updates.text) {
        await supabase
          .from('threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existingMessage.thread_id);
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception updating message:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to update message',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Mark all messages in a thread as read
 * 
 * @param threadId Thread ID
 * @param options Optional filter options
 * @returns Success status
 */
export const markAllMessagesAsRead = async (
  threadId: string,
  options?: { sender?: 'user' | 'ai' }
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get thread DB id
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id')
      .eq('external_id', threadId)
      .eq('user_id', user.id)
      .single();

    if (threadError || !thread) throw new SupabaseError('Thread not found');

    // Build query
    let query = supabase
      .from('messages')
      .update({ is_read: true })
      .eq('thread_id', thread.id);

    // Apply sender filter if provided
    if (options?.sender) {
      query = query.eq('sender', options.sender);
    }

    // Execute update
    const { error } = await query;

    if (error) throw new SupabaseError('Failed to mark messages as read', error);

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception marking messages as read:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to mark messages as read',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

// =============================================
// User Settings
// =============================================

/**
 * Get user settings
 * 
 * @returns User settings
 */
export const getUserSettings = async (): Promise<{ settings: AppSettings | null; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw new SupabaseError('Failed to fetch user settings', error);
    if (!data) {
      // Create default settings if not found
      const defaultSettings: AppSettings = {
        reflectionSimilarityThreshold: 0.90,
        reflectionMinLength: 30,
        theme: 'system',
        showReflectionLabels: true,
        autoReflect: true,
        completedTours: []
      };

      await supabase
        .from('user_settings')
        .insert([{ user_id: user.id, ...defaultSettings }]);

      return { settings: defaultSettings, error: null };
    }

    // Map to app's AppSettings format
    const settings: AppSettings = {
      reflectionSimilarityThreshold: data.reflection_similarity_threshold,
      reflectionMinLength: data.reflection_min_length,
      theme: data.theme as 'system' | 'light' | 'dark',
      showReflectionLabels: data.show_reflection_labels,
      autoReflect: data.auto_reflect,
      completedTours: data.completed_tours || []
    };

    return { settings, error: null };
  } catch (error) {
    console.error('Exception getting user settings:', error);
    return {
      settings: null,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to get user settings',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Update user settings
 * 
 * @param settings Updated settings
 * @returns Success status
 */
export const updateUserSettings = async (
  settings: Partial<AppSettings>
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Map to DB format
    const dbSettings: any = {};
    if (settings.reflectionSimilarityThreshold !== undefined) {
      dbSettings.reflection_similarity_threshold = settings.reflectionSimilarityThreshold;
    }
    if (settings.reflectionMinLength !== undefined) {
      dbSettings.reflection_min_length = settings.reflectionMinLength;
    }
    if (settings.theme !== undefined) {
      dbSettings.theme = settings.theme;
    }
    if (settings.showReflectionLabels !== undefined) {
      dbSettings.show_reflection_labels = settings.showReflectionLabels;
    }
    if (settings.autoReflect !== undefined) {
      dbSettings.auto_reflect = settings.autoReflect;
    }
    if (settings.completedTours !== undefined) {
      dbSettings.completed_tours = settings.completedTours;
    }

    // Update settings
    const { error } = await supabase
      .from('user_settings')
      .update(dbSettings)
      .eq('user_id', user.id);

    if (error) throw new SupabaseError('Failed to update user settings', error);

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception updating user settings:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to update user settings',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

/**
 * Mark a tour as completed
 * 
 * @param tourId ID of the completed tour
 * @returns Success status
 */
export const markTourCompleted = async (
  tourId: string
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Get current completed tours
    const { data, error: fetchError } = await supabase
      .from('user_settings')
      .select('completed_tours')
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw new SupabaseError('Failed to fetch user settings', fetchError);

    // Add this tour if not already included
    const completedTours = data?.completed_tours || [];
    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId);

      const { error } = await supabase
        .from('user_settings')
        .update({ completed_tours: completedTours })
        .eq('user_id', user.id);

      if (error) throw new SupabaseError('Failed to update completed tours', error);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception marking tour as completed:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to mark tour as completed',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};

// =============================================
// Data Synchronization
// =============================================

/**
 * Sync all local data to the server
 * This is useful for initial data upload when a user first creates an account
 * 
 * @param data Local data to sync
 * @returns Success status
 */
export const syncLocalDataToServer = async (
  data: {
    entries?: JournalEntry[];
    conversations?: Conversation[];
    messages?: Message[];
    settings?: AppSettings;
  }
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new SupabaseError('Not authenticated');

    // Start a transaction for data integrity
    const { error: txError } = await supabase.rpc('begin_transaction');
    if (txError) throw new SupabaseError('Failed to start transaction', txError);

    try {
      // 1. Sync settings
      if (data.settings) {
        await updateUserSettings(data.settings);
      }

      // 2. Sync journal entries
      const entryMap = new Map<string, string>(); // clientId -> serverId
      if (data.entries && data.entries.length > 0) {
        for (const entry of data.entries) {
          const { entry: createdEntry, error } = await createJournalEntry(entry);
          if (error) throw error;
          if (createdEntry) {
            entryMap.set(entry.id, createdEntry.id);
          }
        }
      }

      // 3. Sync threads/conversations
      const threadMap = new Map<string, string>(); // clientId -> serverId
      if (data.conversations && data.conversations.length > 0) {
        for (const conversation of data.conversations) {
          // If this is an entry-specific thread, get the entry's server ID
          let entryId = undefined;
          if (conversation.id.includes('entry-')) {
            const parts = conversation.id.split('-');
            const possibleEntryId = `entry-${parts[1]}-${parts[2]}`;
            if (entryMap.has(possibleEntryId)) {
              entryId = entryMap.get(possibleEntryId);
            }
          }

          const { thread: createdThread, error } = await createThread({
            ...conversation,
            entryId
          });

          if (error) throw error;
          if (createdThread) {
            threadMap.set(conversation.id, createdThread.id);
          }
        }
      }

      // 4. Sync messages
      if (data.messages && data.messages.length > 0) {
        for (const message of data.messages) {
          // Find the corresponding thread ID
          const threadId = threadMap.get(message.threadId) || message.threadId;

          await addMessage({
            ...message,
            threadId
          });
        }
      }

      // Commit transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw new SupabaseError('Failed to commit transaction', commitError);

      return { success: true, error: null };
    } catch (error) {
      // Rollback transaction on error
      await supabase.rpc('rollback_transaction');

      throw error instanceof SupabaseError ? error : new SupabaseError('Data synchronization failed', error);
    }
  } catch (error) {
    console.error('Exception syncing local data to server:', error);
    return {
      success: false,
      error: error instanceof SupabaseError ? error : new SupabaseError(
        'Failed to sync local data to server',
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
};