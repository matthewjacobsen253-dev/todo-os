/**
 * Core TypeScript types for the Ultimate To-Do OS application
 * Defines database schema types, business logic types, and utility types
 */

// ============================================================================
// UTILITY TYPES - Enums and Union Types
// ============================================================================

export type TaskStatus =
  | "inbox"
  | "todo"
  | "in_progress"
  | "waiting"
  | "done"
  | "cancelled";

export type TaskPriority = "urgent" | "high" | "medium" | "low" | "none";

export type TaskSourceType = "manual" | "email" | "meeting" | "briefing";

export type TaskGroupBy =
  | "none"
  | "project"
  | "priority"
  | "status"
  | "due_date";
export type TaskSortField =
  | "priority"
  | "due_date"
  | "status"
  | "created_at"
  | "title";
export type SortDirection = "asc" | "desc";

export type WorkspaceRole = "owner" | "admin" | "member";

export type ProjectStatus = "active" | "archived";

export type EmailProvider = "gmail" | "outlook";

export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "task_mentioned"
  | "briefing_ready"
  | "workspace_invite"
  | "scan_complete"
  | "review_needed";

export type EntityType =
  | "workspace"
  | "project"
  | "task"
  | "tag"
  | "briefing"
  | "source";

// ============================================================================
// DATABASE TYPES - Direct mappings to Supabase schema
// ============================================================================

/**
 * User profile stored in auth.users and public.user_profiles
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Workspace represents an organization or team
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  settings: WorkspaceSettings;
}

/**
 * Settings for a workspace
 */
export interface WorkspaceSettings {
  timezone?: string;
  theme?: "light" | "dark" | "system";
  language?: string;
  notifications_enabled?: boolean;
  [key: string]: unknown;
}

/**
 * Workspace member with role and permissions
 */
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

/**
 * Project for organizing tasks
 */
export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
}

/**
 * Tag for categorizing tasks
 */
export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

/**
 * Source tracks where tasks come from
 */
export interface Source {
  id: string;
  workspace_id: string;
  type: "email" | "meeting" | "manual";
  external_id: string | null;
  title: string;
  content_preview: string | null;
  metadata: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

/**
 * Task - the core entity of the application
 * Note: Tags are stored via task_tags junction table, not on the tasks table directly.
 * The tags field is optional and only populated when joined with task_tags.
 */
export interface Task {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee_id: string | null;
  creator_id: string;
  source_type: TaskSourceType;
  source_id: string | null;
  confidence_score: number | null;
  needs_review: boolean;
  tags?: string[]; // Optional - populated from task_tags junction table when needed
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Email scanning configuration
 */
export interface EmailScanConfig {
  id: string;
  workspace_id: string;
  user_id: string;
  provider: EmailProvider;
  enabled: boolean;
  scan_interval_hours: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  weekend_scan: boolean;
  confidence_threshold: number;
  last_scan_at: string | null;
  created_at: string;
}

/**
 * User preferences for daily briefings
 */
export interface BriefingPreference {
  id: string;
  workspace_id: string;
  user_id: string;
  delivery_time: string;
  timezone: string;
  enabled: boolean;
  include_email: boolean;
  filters: BriefingFilters;
  created_at: string;
}

/**
 * Filters for briefing content
 */
export interface BriefingFilters {
  projects?: string[];
  priorities?: TaskPriority[];
  include_completed?: boolean;
  [key: string]: unknown;
}

/**
 * Daily briefing content
 */
export interface Briefing {
  id: string;
  workspace_id: string;
  user_id: string;
  date: string;
  content: BriefingContent;
  feedback: "thumbs_up" | "thumbs_down" | null;
  feedback_notes: string | null;
  created_at: string;
}

/**
 * Structured briefing content
 */
export interface BriefingContent {
  top_outcomes: Array<{
    task_id: string;
    title: string;
    priority: TaskPriority;
  }>;
  must_do: Array<{
    task_id: string;
    title: string;
    due_date: string | null;
    priority: TaskPriority;
  }>;
  defer_suggestions: Array<{
    task_id: string;
    title: string;
    reason: string;
  }>;
  waiting_on: Array<{
    task_id: string;
    title: string;
    waiting_for: string;
  }>;
  overdue: Array<{
    task_id: string;
    title: string;
    days_overdue: number;
    priority: TaskPriority;
  }>;
  summary?: {
    total_tasks: number;
    urgent_count: number;
    completed_today: number;
  };
}

/**
 * @deprecated feedback is now stored as "thumbs_up" | "thumbs_down" directly on Briefing
 */
export interface BriefingFeedback {
  helpful: boolean;
  accuracy_rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

/**
 * Audit log for workspace changes
 */
export interface AuditLog {
  id: string;
  workspace_id: string;
  entity_type: EntityType;
  entity_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * In-app notification
 */
export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

// ============================================================================
// EXTENDED TYPES - Enriched with relationships
// ============================================================================

/**
 * Task with full relationship data
 */
export interface TaskWithRelations extends Task {
  project?: Project | null;
  assignee?: UserProfile | null;
  creator?: UserProfile;
  tags_data?: Tag[];
  source?: Source | null;
}

/**
 * Project with task count
 */
export interface ProjectWithStats extends Project {
  task_count: number;
  completed_count: number;
}

/**
 * Workspace with current user's role and member info
 */
export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  member_count: number;
}

/**
 * Briefing with task details included
 */
export interface BriefingWithTasks extends Briefing {
  tasks?: TaskWithRelations[];
}

// ============================================================================
// UI/STATE TYPES - For component and store state
// ============================================================================

/**
 * Task filters for the UI
 */
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  project?: string | null;
  assignee?: string | null;
  search?: string;
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  timestamp?: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================================================
// FORM TYPES - For creating/updating entities
// ============================================================================

/**
 * Task creation form
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  project_id?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
  tags?: string[];
}

/**
 * Task update form
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
  tags?: string[];
}

/**
 * Project creation form
 */
export interface CreateProjectInput {
  name: string;
  color: string;
  icon: string;
  description?: string;
}

/**
 * Project update form
 */
export interface UpdateProjectInput {
  name?: string;
  color?: string;
  icon?: string;
  description?: string;
  status?: ProjectStatus;
}

/**
 * Workspace creation form
 */
export interface CreateWorkspaceInput {
  name: string;
  slug: string;
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

/**
 * Search result with highlights
 */
export interface SearchResult {
  type: "task" | "project" | "tag";
  id: string;
  title: string;
  description?: string;
  workspace_id: string;
  highlight?: string;
}

/**
 * Advanced search query
 */
export interface SearchQuery {
  text: string;
  filters?: TaskFilters;
  sort?: {
    field: keyof Task;
    direction: "asc" | "desc";
  };
}

// ============================================================================
// EMAIL INTEGRATION TYPES
// ============================================================================

/**
 * Review queue item for email-extracted tasks
 */
export interface ReviewQueueItem {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  confidence_score: number;
  source_type: TaskSourceType;
  source_email_subject: string | null;
  source_email_sender: string | null;
  source_email_date: string | null;
  review_status: "pending" | "approved" | "rejected";
  created_at: string;
}

/**
 * Email scan log entry
 */
export interface EmailScanLog {
  id: string;
  config_id: string;
  workspace_id: string;
  emails_scanned: number;
  tasks_extracted: number;
  tasks_for_review: number;
  errors: string[];
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "failed";
}

/**
 * Email connection status for Settings UI
 */
export interface EmailConnectionStatus {
  connected: boolean;
  provider: EmailProvider | null;
  email: string | null;
  last_scan_at: string | null;
  enabled: boolean;
  config_id: string | null;
}

/**
 * Form input for updating scan configuration
 */
export interface UpdateEmailScanConfigInput {
  scan_interval_hours?: number;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  weekend_scan?: boolean;
  confidence_threshold?: number;
  enabled?: boolean;
}

/**
 * Claude extraction output shape for a single task
 */
export interface ExtractedTaskFromEmail {
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  confidence_score: number;
}

/**
 * Per-email extraction result
 */
export interface EmailExtractionResult {
  email_id: string;
  email_subject: string;
  email_sender: string;
  email_date: string;
  tasks: ExtractedTaskFromEmail[];
  error: string | null;
}

/**
 * Normalized email message from any provider (Gmail, Outlook)
 */
export interface NormalizedEmail {
  id: string;
  subject: string;
  sender: string;
  date: string;
  body: string;
  snippet: string;
}
