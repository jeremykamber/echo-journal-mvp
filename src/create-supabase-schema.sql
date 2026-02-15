-- Complete Supabase/Postgres schema for the service (fresh project)
-- NOTE: This file assumes a brand-new database. It intentionally does NOT use IF NOT EXISTS.
-- Run in Supabase SQL editor or psql as a superuser.

-- Extensions
CREATE EXTENSION pg_trgm;
CREATE EXTENSION vector; -- if your Postgres/Supabase instance supports pgvector

-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.stash_source_type AS ENUM ('journal','conversation');
CREATE TYPE public.reflection_feedback_type AS ENUM ('like','dislike');
CREATE TYPE public.reflection_type AS ENUM ('chat-response','realtime-reflection');
CREATE TYPE public.privacy_level AS ENUM ('private','shared','public');
CREATE TYPE public.message_sender AS ENUM ('user','ai','system');
CREATE TYPE public.plan_tier AS ENUM ('free','pro','team','enterprise');

-- =========================
-- users (application profile)
-- =========================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID, -- optional explicit reference to auth.users(id)
  email TEXT,
  name TEXT,
  username TEXT,
  bio TEXT,
  is_beta_user BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  locale TEXT DEFAULT 'en',
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb, -- flexible user metadata
  plan plan_tier DEFAULT 'free',
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_username_unique UNIQUE (username)
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY users_insert_self
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE INDEX users_last_seen_idx ON public.users (last_seen_at);
CREATE INDEX users_plan_idx ON public.users (plan);
CREATE INDEX users_email_idx ON public.users (email);
CREATE INDEX users_username_idx ON public.users (username);

-- =========================
-- organizations & memberships (anticipate teams/multi-tenant)
-- =========================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'member' | 'admin' | 'billing'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT org_member_unique UNIQUE (organization_id, user_id)
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select_public
  ON public.organizations
  FOR SELECT
  USING (true); -- org listing can be public; tighten later as needed

CREATE POLICY org_memberships_select_for_user
  ON public.organization_memberships
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.organization_memberships om WHERE om.organization_id = public.organization_memberships.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- =========================
-- user_settings
-- =========================
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  reflection_similarity_threshold DOUBLE PRECISION DEFAULT 0.9,
  reflection_min_length INTEGER DEFAULT 30,
  theme TEXT DEFAULT 'system',
  show_reflection_labels BOOLEAN DEFAULT TRUE,
  auto_reflect BOOLEAN DEFAULT TRUE,
  enable_memories BOOLEAN DEFAULT TRUE,
  show_nudges BOOLEAN DEFAULT TRUE,
  enable_whisper BOOLEAN DEFAULT FALSE,
  enable_sharing BOOLEAN DEFAULT FALSE,
  completed_tours JSONB DEFAULT '[]'::jsonb,
  ai_provider TEXT DEFAULT 'cloud',
  local_model_id TEXT DEFAULT 'Qwen2-1.5B-Instruct-q4f32_1-MLC',
  preferred_model TEXT DEFAULT 'gpt-4o',
  temperature DOUBLE PRECISION DEFAULT 0.0,
  max_tokens INTEGER DEFAULT 2048,
  vector_index_enabled BOOLEAN DEFAULT FALSE,
  daily_digest_time TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_select_self
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_settings_insert_self
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_settings_update_self
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_settings_ai_provider_idx ON public.user_settings (ai_provider);
CREATE INDEX user_settings_preferred_model_idx ON public.user_settings (preferred_model);

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.user_settings_updated_at_trigger_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_settings_updated_at_trg
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.user_settings_updated_at_trigger_fn();

-- =========================
-- journal_entries
-- =========================
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT,
  content TEXT,
  mood TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  visibility public.privacy_level DEFAULT 'private',
  word_count INTEGER,
  archived BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  search_vector tsvector
);

CREATE UNIQUE INDEX journal_entries_user_external_unique ON public.journal_entries (user_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX journal_entries_user_date_idx ON public.journal_entries (user_id, date DESC);
CREATE INDEX journal_entries_external_idx ON public.journal_entries (external_id);
CREATE INDEX journal_entries_search_trgm ON public.journal_entries USING gin ((coalesce(title,'') || ' ' || coalesce(content,'')) gin_trgm_ops);
CREATE INDEX journal_entries_search_tsv ON public.journal_entries USING gin (search_vector);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY journal_entries_select_owner
  ON public.journal_entries
  FOR SELECT
  USING (auth.uid() = user_id OR visibility = 'public' OR EXISTS (SELECT 1 FROM public.organization_memberships om WHERE om.user_id = auth.uid() AND om.organization_id = NULL)); -- placeholder for org-shared logic

CREATE POLICY journal_entries_insert_owner
  ON public.journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY journal_entries_update_owner
  ON public.journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY journal_entries_delete_owner
  ON public.journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger function: updated_at + search_vector
CREATE OR REPLACE FUNCTION public.journal_entries_updated_at_and_vector_trigger_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.word_count = (SELECT COALESCE(array_length(regexp_split_to_array(coalesce(NEW.content,''), '\s+'),1),0));
  NEW.search_vector = to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.content,''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entries_updated_at_trg
BEFORE UPDATE OR INSERT ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.journal_entries_updated_at_and_vector_trigger_fn();

-- =========================
-- threads
-- =========================
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  external_id TEXT,
  title TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  privacy public.privacy_level DEFAULT 'private',
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  share_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX threads_user_external_unique ON public.threads (user_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX threads_user_updated_idx ON public.threads (user_id, updated_at DESC);
CREATE INDEX threads_is_global_idx ON public.threads (is_global);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY threads_select_owner
  ON public.threads
  FOR SELECT
  USING (auth.uid() = user_id OR is_global = TRUE);

CREATE POLICY threads_insert_owner
  ON public.threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY threads_update_owner
  ON public.threads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY threads_delete_owner
  ON public.threads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION public.threads_updated_at_trigger_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER threads_updated_at_trg
BEFORE UPDATE ON public.threads
FOR EACH ROW EXECUTE FUNCTION public.threads_updated_at_trigger_fn();

-- =========================
-- thread_participants (for shared threads)
-- =========================
CREATE TABLE public.thread_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer', -- viewer | editor | owner
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT thread_participant_unique UNIQUE (thread_id, user_id)
);

ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY thread_participants_select_for_user
  ON public.thread_participants
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = public.thread_participants.thread_id AND tp.user_id = auth.uid()));

-- =========================
-- model_runs (AI inference logging + cost tracking)
-- =========================
CREATE TABLE public.model_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES public.threads(id) ON DELETE SET NULL,
  prompt TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  response TEXT,
  response_tokens INTEGER DEFAULT 0,
  model_name TEXT,
  model_version TEXT,
  provider TEXT,
  cost_cents BIGINT DEFAULT 0, -- track cost in smallest currency unit
  status TEXT DEFAULT 'completed', -- pending | running | completed | failed
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY model_runs_select_owner
ON public.model_runs
FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX model_runs_user_idx ON public.model_runs (user_id);
CREATE INDEX model_runs_created_idx ON public.model_runs (created_at DESC);

-- =========================
-- messages
-- =========================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  external_id TEXT,
  sender public.message_sender NOT NULL DEFAULT 'user',
  sender_id UUID, -- optional: references user who sent it
  text TEXT,
  content JSONB, -- raw message payload (structured segments, attachments metadata, etc)
  role TEXT, -- optional role label (assistant, system, user)
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  is_realtime_reflection BOOLEAN DEFAULT FALSE,
  reflected_content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  tokens_used INTEGER DEFAULT 0,
  model_run_id UUID REFERENCES public.model_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ADD CONSTRAINT messages_sender_check CHECK (sender IN ('user','ai','system'));

CREATE INDEX messages_thread_created_idx ON public.messages (thread_id, created_at);
CREATE INDEX messages_thread_sender_idx ON public.messages (thread_id, sender);
CREATE INDEX messages_external_idx ON public.messages (external_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_by_thread_owner
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.threads t WHERE t.id = public.messages.thread_id
      AND (t.user_id = auth.uid() OR t.is_global = TRUE OR EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = t.id AND tp.user_id = auth.uid()))
    )
  );

CREATE POLICY messages_insert_if_thread_owned
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.threads t WHERE t.id = public.messages.thread_id
      AND (t.user_id = auth.uid() OR t.is_global = TRUE OR EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = t.id AND tp.user_id = auth.uid()))
    )
  );

CREATE POLICY messages_update_if_thread_owned
  ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.threads t WHERE t.id = public.messages.thread_id
      AND (t.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = t.id AND tp.user_id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.threads t WHERE t.id = public.messages.thread_id
      AND (t.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = t.id AND tp.user_id = auth.uid()))
    )
  );

CREATE POLICY messages_delete_if_thread_owned
  ON public.messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.threads t WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
    )
  );

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.messages_updated_at_trigger_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_updated_at_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_updated_at_trigger_fn();

-- =========================
-- attachments (files, images)
-- =========================
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES public.threads(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  bucket_name TEXT,
  object_key TEXT,
  url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_select_owner
  ON public.attachments
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE INDEX attachments_owner_idx ON public.attachments (owner_id);
CREATE INDEX attachments_thread_idx ON public.attachments (thread_id);


-- =========================
-- embeddings (vector storage if using pgvector)
-- =========================
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_id UUID, -- e.g. message_id / journal entry / stash id
  parent_table TEXT,
  model TEXT,
  vector vector(1536), -- adjust dimension to your model (example 1536)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY embeddings_select_owner
  ON public.embeddings
  FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX embeddings_user_idx ON public.embeddings (user_id);
CREATE INDEX embeddings_parent_idx ON public.embeddings (parent_table, parent_id);

-- =========================
-- stash (stashed reflections)
-- =========================
CREATE TABLE public.stash (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reflection_text TEXT NOT NULL,
  source_type public.stash_source_type NOT NULL,
  source_id TEXT,
  source_title_or_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE, -- when reflection originally written
  stashed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.stash ENABLE ROW LEVEL SECURITY;

CREATE POLICY stash_insert_policy
  ON public.stash
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY stash_select_owner
  ON public.stash
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY stash_delete_owner
  ON public.stash
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX stash_user_id_idx ON public.stash (user_id);
CREATE INDEX stash_stashed_at_idx ON public.stash (stashed_at DESC);

-- =========================
-- reflections_feedback
-- =========================
CREATE TABLE public.reflections_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_id UUID, -- id of message / stash / journal entry
  target_table TEXT,
  reflection_text TEXT NOT NULL,
  feedback_type public.reflection_feedback_type NOT NULL,
  reflection_type public.reflection_type NOT NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.reflections_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY reflections_feedback_insert_policy
  ON public.reflections_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY reflections_feedback_select_owner
  ON public.reflections_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX reflections_feedback_user_idx ON public.reflections_feedback (user_id);
CREATE INDEX reflections_feedback_created_idx ON public.reflections_feedback (created_at DESC);

-- =========================
-- app_feedback (user satisfaction)
-- =========================
CREATE TABLE public.app_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  emoji_rating TEXT NOT NULL,
  rating_score INTEGER,
  additional_feedback TEXT,
  category TEXT,
  session_id TEXT,
  release_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT app_feedback_valid_rating CHECK (emoji_rating IN ('😃','🙂','😐','😞'))
);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_feedback_insert_policy
  ON public.app_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY app_feedback_select_owner
  ON public.app_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX app_feedback_user_id_idx ON public.app_feedback (user_id);
CREATE INDEX app_feedback_created_at_idx ON public.app_feedback (created_at DESC);

-- =========================
-- notifications (in-app / push)
-- =========================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  delivered BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_owner
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, read);

-- =========================
-- subscriptions / billing placeholders
-- =========================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  provider TEXT,
  provider_subscription_id TEXT,
  tier plan_tier DEFAULT 'free',
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX subscriptions_user_idx ON public.subscriptions (user_id);
CREATE INDEX subscriptions_organization_idx ON public.subscriptions (organization_id);

-- =========================
-- audit_logs (for admin / server actions)
-- =========================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_ip TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  row_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_user_id);
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);

-- =========================
-- webhooks (incoming/outgoing event hooks)
-- =========================
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  secret TEXT,
  event TEXT,
  active BOOLEAN DEFAULT TRUE,
  last_delivery JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================
-- Convenience triggers & utility functions
-- =========================

-- Generic updated_at trigger for tables that have updated_at column
CREATE OR REPLACE FUNCTION public.updated_at_trigger_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = NOW();
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach generic updated_at trigger to tables where not already created
CREATE TRIGGER user_updated_at_trg BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger_fn();
CREATE TRIGGER threads_generic_updated_at_trg BEFORE UPDATE ON public.threads FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger_fn();
CREATE TRIGGER messages_generic_updated_at_trg BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger_fn();
CREATE TRIGGER journal_entries_generic_updated_at_trg BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger_fn();
CREATE TRIGGER model_runs_generic_updated_at_trg BEFORE UPDATE ON public.model_runs FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger_fn();

-- =========================
-- Default RLS for administrative/background functions
-- =========================
-- For server-side jobs, create SECURITY DEFINER functions or use service_role key.
-- Example: an insert function for audit_logs that can be called by service_role and is SECURITY DEFINER (create separately and set owner to a superuser).

-- =========================
-- Indexing & performance tuning notes
-- =========================
-- Consider partial indexes for frequent queries, and GIN indexes on JSONB fields used in filtering.
-- For vector similarity, create index using ivfflat or cosine distance depending on pgvector configuration:
--   CREATE INDEX embeddings_vector_idx ON public.embeddings USING ivfflat (vector) WITH (lists = 100);
-- (Tune lists and distance metric to your usage.)

-- =========================
-- Grants (commented — apply as needed)
-- =========================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;

-- =========================
-- Final notes:
-- - This schema anticipates team features, vector search/embeddings, model-run logging, attachments and richer message & thread metadata.
-- - RLS policies are conservative: most read/write operations require auth.uid() ownership, with special allowances for global threads and participants.
-- - For server-side operations that must bypass RLS (cron jobs, ingestion), implement SECURITY DEFINER functions owned by a superuser and call them using your Supabase service_role.
