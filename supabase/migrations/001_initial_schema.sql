-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- PROFILES TABLE - Extended Supabase auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can read any profile"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspaces RLS policies
CREATE POLICY "Workspace members can read workspace"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id));

CREATE POLICY "Workspace owners can update workspace"
  ON public.workspaces FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- WORKSPACE_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS on workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace members RLS policies
CREATE POLICY "Workspace members can read members list"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can manage members"
  ON public.workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace admins can add members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Workspace members can read projects"
  ON public.projects FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update projects"
  ON public.projects FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete projects"
  ON public.projects FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- Create index for projects
CREATE INDEX idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  UNIQUE(workspace_id, name)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Tags RLS policies
CREATE POLICY "Workspace members can read tags"
  ON public.tags FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update tags"
  ON public.tags FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Create index for tags
CREATE INDEX idx_tags_workspace_id ON public.tags(workspace_id);

-- ============================================================================
-- SOURCES TABLE - Email, meetings, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'meeting', 'manual')),
  external_id TEXT,
  title TEXT,
  content_preview TEXT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sources
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Sources RLS policies
CREATE POLICY "Workspace members can read sources"
  ON public.sources FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create sources"
  ON public.sources FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Create indexes for sources
CREATE INDEX idx_sources_workspace_id ON public.sources(workspace_id);
CREATE INDEX idx_sources_external_id ON public.sources(external_id);
CREATE INDEX idx_sources_type ON public.sources(type);

-- ============================================================================
-- TASKS TABLE - Core task management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'todo', 'in_progress', 'waiting', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')),
  due_date TIMESTAMPTZ,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.profiles(id),
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'email', 'meeting', 'briefing')),
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  needs_review BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks RLS policies
CREATE POLICY "Workspace members can read tasks"
  ON public.tasks FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- Create indexes for tasks
CREATE INDEX idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_source_id ON public.tasks(source_id);
CREATE INDEX idx_tasks_needs_review ON public.tasks(needs_review);

-- Full text search index on tasks
CREATE INDEX idx_tasks_fts ON public.tasks USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- TASK_TAGS TABLE - Junction table for task-tag relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_tags (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Enable RLS on task_tags
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- Task tags RLS policies
CREATE POLICY "Workspace members can read task tags"
  ON public.task_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_tags.task_id
      AND public.is_workspace_member(t.workspace_id)
    )
  );

CREATE POLICY "Workspace members can manage task tags"
  ON public.task_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_tags.task_id
      AND public.is_workspace_member(t.workspace_id)
    )
  );

-- ============================================================================
-- BRIEFING_PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.briefing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivery_time TIME DEFAULT '07:00',
  timezone TEXT DEFAULT 'America/New_York',
  enabled BOOLEAN DEFAULT true,
  include_email BOOLEAN DEFAULT true,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS on briefing_preferences
ALTER TABLE public.briefing_preferences ENABLE ROW LEVEL SECURITY;

-- Briefing preferences RLS policies
CREATE POLICY "Users can read own briefing preferences"
  ON public.briefing_preferences FOR SELECT
  USING (auth.uid() = user_id OR public.is_workspace_member(workspace_id));

CREATE POLICY "Users can update own briefing preferences"
  ON public.briefing_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefing preferences"
  ON public.briefing_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_workspace_member(workspace_id));

-- Create indexes for briefing_preferences
CREATE INDEX idx_briefing_preferences_workspace_id ON public.briefing_preferences(workspace_id);
CREATE INDEX idx_briefing_preferences_user_id ON public.briefing_preferences(user_id);

-- ============================================================================
-- BRIEFINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content JSONB NOT NULL,
  feedback TEXT CHECK (feedback IN ('thumbs_up', 'thumbs_down') OR feedback IS NULL),
  feedback_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id, date)
);

-- Enable RLS on briefings
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

-- Briefings RLS policies
CREATE POLICY "Users can read own briefings"
  ON public.briefings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert briefings"
  ON public.briefings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own briefings"
  ON public.briefings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for briefings
CREATE INDEX idx_briefings_workspace_id ON public.briefings(workspace_id);
CREATE INDEX idx_briefings_user_id ON public.briefings(user_id);
CREATE INDEX idx_briefings_date ON public.briefings(date);

-- ============================================================================
-- EMAIL_SCAN_CONFIGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_scan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  enabled BOOLEAN DEFAULT false,
  scan_interval_hours INTEGER DEFAULT 3,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  weekend_scan BOOLEAN DEFAULT false,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.7 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id, provider)
);

-- Enable RLS on email_scan_configs
ALTER TABLE public.email_scan_configs ENABLE ROW LEVEL SECURITY;

-- Email scan configs RLS policies
CREATE POLICY "Users can read own email scan configs"
  ON public.email_scan_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own email scan configs"
  ON public.email_scan_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_workspace_member(workspace_id));

CREATE POLICY "Users can update own email scan configs"
  ON public.email_scan_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for email_scan_configs
CREATE INDEX idx_email_scan_configs_workspace_id ON public.email_scan_configs(workspace_id);
CREATE INDEX idx_email_scan_configs_user_id ON public.email_scan_configs(user_id);
CREATE INDEX idx_email_scan_configs_enabled ON public.email_scan_configs(enabled);

-- ============================================================================
-- EMAIL_SCAN_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.email_scan_configs(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  emails_scanned INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  tasks_review INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed'))
);

-- Enable RLS on email_scan_logs
ALTER TABLE public.email_scan_logs ENABLE ROW LEVEL SECURITY;

-- Email scan logs RLS policies
CREATE POLICY "Users can read own email scan logs"
  ON public.email_scan_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.email_scan_configs esc
      WHERE esc.id = email_scan_logs.config_id
      AND esc.user_id = auth.uid()
    )
  );

-- Create indexes for email_scan_logs
CREATE INDEX idx_email_scan_logs_config_id ON public.email_scan_logs(config_id);
CREATE INDEX idx_email_scan_logs_started_at ON public.email_scan_logs(started_at);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs RLS policies
CREATE POLICY "Workspace members can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "System can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_workspace_id ON public.audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'briefing_ready', 'scan_complete', 'review_needed')),
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS policies
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_workspace_id ON public.notifications(workspace_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for workspaces
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for briefing_preferences
CREATE TRIGGER update_briefing_preferences_updated_at
  BEFORE UPDATE ON public.briefing_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for email_scan_configs
CREATE TRIGGER update_email_scan_configs_updated_at
  BEFORE UPDATE ON public.email_scan_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TRIGGERS FOR AUTO-CREATE PROFILE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profile_on_auth_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_on_signup();

-- ============================================================================
-- TRIGGERS FOR AUTO-CREATE WORKSPACE MEMBER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_workspace_owner_on_workspace_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_workspace_member_on_workspace_insert
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workspace_owner_on_workspace_create();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Get all workspaces for a user
CREATE OR REPLACE FUNCTION public.get_user_workspaces(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  owner_id UUID,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name, w.slug, w.owner_id, w.settings, w.created_at, w.updated_at
  FROM public.workspaces w
  INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = user_uuid
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Full text search for tasks
CREATE OR REPLACE FUNCTION public.search_tasks(ws_id UUID, query_text TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.description, t.status, t.priority,
         ts_rank(to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')),
                 plainto_tsquery('english', query_text))::REAL
  FROM public.tasks t
  WHERE t.workspace_id = ws_id
  AND to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', query_text)
  ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_workspaces(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_tasks(UUID, TEXT) TO authenticated;
