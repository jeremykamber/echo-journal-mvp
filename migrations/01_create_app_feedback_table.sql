-- Migration: Create app_feedback table for emoji ratings and followup feedback
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  emoji_rating TEXT NOT NULL,
  additional_feedback TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add RLS policies
  CONSTRAINT valid_emoji_rating CHECK (emoji_rating IN ('😃', '🙂', '😐', '😞'))
);

-- Add RLS (Row Level Security)
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own feedback
CREATE POLICY app_feedback_insert_policy 
  ON public.app_feedback 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to view only their own feedback
CREATE POLICY app_feedback_select_policy 
  ON public.app_feedback 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Grant access to authenticated and anonymous users
GRANT INSERT ON public.app_feedback TO authenticated;
GRANT INSERT ON public.app_feedback TO anon;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS app_feedback_user_id_idx ON public.app_feedback (user_id);
CREATE INDEX IF NOT EXISTS app_feedback_created_at_idx ON public.app_feedback (created_at);
