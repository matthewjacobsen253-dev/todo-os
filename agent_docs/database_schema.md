# Ultimate To-Do OS - Database Schema Documentation

## Overview

The Ultimate To-Do OS database is built on Supabase (PostgreSQL) and implements a multi-tenant SaaS architecture using workspace-based isolation. The schema supports email scanning, AI-powered task extraction, daily briefings, and comprehensive audit logging.

### Key Design Principles

1. **Multi-Tenant Architecture**: All data is scoped to a workspace via `workspace_id`
2. **Row-Level Security (RLS)**: Fine-grained access control via PostgreSQL policies
3. **Audit Trail**: Comprehensive action logging for compliance and debugging
4. **Extensibility**: JSONB fields for flexible metadata and configuration
5. **Performance**: Strategic indexing on frequently queried columns
6. **Data Integrity**: Cascading deletes where appropriate, referential constraints

---

## Extension Requirements

```sql
CREATE EXTENSION uuid-ossp;  -- UUID generation
CREATE EXTENSION pg_trgm;    -- Fuzzy text search support
```

---

## Core Tables

### profiles

Extends Supabase's built-in `auth.users` table with application-specific user information.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, references auth.users(id) |
| `email` | TEXT | Unique email, synced from auth.users |
| `full_name` | TEXT | User's display name |
| `avatar_url` | TEXT | Profile picture URL |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on modification |

**Relationships:**

- Referenced by: `workspace_members`, `tasks` (assignee/creator), `briefing_preferences`, `email_scan_configs`

**RLS Policies:**

- SELECT: All authenticated users can read any profile
- UPDATE: Users can only update their own profile
- INSERT: Users can only insert their own profile

**Triggers:**

- `create_profile_on_auth_user_insert`: Auto-create profile when user signs up

---

### workspaces

Represents an isolated workspace/organization. Multi-tenant boundary for all data.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, auto-generated |
| `name` | TEXT | Workspace display name |
| `slug` | TEXT | URL-friendly identifier, unique |
| `owner_id` | UUID | References profiles.id, workspace creator |
| `settings` | JSONB | Flexible configuration object (themes, integrations, etc.) |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on modification |

**Relationships:**

- Owner: references `profiles`
- Members: linked via `workspace_members`
- Contains: `projects`, `tasks`, `tags`, `sources`, `briefing_preferences`, `email_scan_configs`

**RLS Policies:**

- SELECT: Only workspace members can read
- UPDATE: Only workspace owner can update

**Triggers:**

- `create_workspace_owner_on_workspace_insert`: Auto-add owner to workspace_members as 'owner'
- `update_workspaces_updated_at`: Auto-update timestamp

---

### workspace_members

Junction table managing users within workspaces and their roles.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `user_id` | UUID | References profiles.id, ON DELETE CASCADE |
| `role` | TEXT | Enum: 'owner', 'admin', 'member' (default: 'member') |
| `joined_at` | TIMESTAMPTZ | When user joined workspace |

**Constraints:**

- `UNIQUE(workspace_id, user_id)`: Prevent duplicate memberships
- CHECK: Role must be one of owner/admin/member

**RLS Policies:**

- SELECT: Workspace members can read members list
- UPDATE: Only admins/owners can manage members
- INSERT: Only admins/owners can add members

**Security Note:**
Uses helper function `is_workspace_member()` to verify access rights in RLS policies.

---

### projects

Organize tasks into logical projects within a workspace.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE, NOT NULL |
| `name` | TEXT | Project name |
| `description` | TEXT | Detailed description |
| `color` | TEXT | Hex color for UI (default: '#6366f1') |
| `icon` | TEXT | Emoji or icon identifier |
| `status` | TEXT | Enum: 'active', 'archived' (default: 'active') |
| `position` | INTEGER | Sort order within workspace (default: 0) |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on modification |

**RLS Policies:**

- SELECT/INSERT/UPDATE/DELETE: Workspace members only

**Indexes:**

- `idx_projects_workspace_id`: Fast lookups by workspace
- `idx_projects_status`: Filter active vs archived

**Triggers:**

- `update_projects_updated_at`: Auto-update timestamp

---

### tags

User-defined tags for categorizing and filtering tasks.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `name` | TEXT | Tag label (e.g., 'urgent', 'client-xyz') |
| `color` | TEXT | Hex color (default: '#6366f1') |

**Constraints:**

- `UNIQUE(workspace_id, name)`: Tag names unique per workspace

**RLS Policies:**

- SELECT/INSERT/UPDATE: Workspace members only

**Indexes:**

- `idx_tags_workspace_id`: Fast tag lookup

---

### sources

Tracks the origin of tasks (email, meetings, manual entry, briefing extraction).

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `type` | TEXT | Enum: 'email', 'meeting', 'manual' |
| `external_id` | TEXT | ID from external system (e.g., Gmail message ID) |
| `title` | TEXT | Source title (e.g., email subject) |
| `content_preview` | TEXT | Truncated source content |
| `metadata` | JSONB | Flexible storage for: {sender, messageId, threadId, labels, etc.} |
| `processed_at` | TIMESTAMPTZ | When AI processed this source |
| `created_at` | TIMESTAMPTZ | When source was captured |

**RLS Policies:**

- SELECT/INSERT: Workspace members only

**Indexes:**

- `idx_sources_workspace_id`: Workspace lookup
- `idx_sources_external_id`: Prevent duplicate ingestion
- `idx_sources_type`: Filter by source type

---

### tasks

Core task management table - the heart of the application.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE, NOT NULL |
| `project_id` | UUID | References projects.id, ON DELETE SET NULL (optional grouping) |
| `title` | TEXT | Task title (required) |
| `description` | TEXT | Detailed task description |
| `status` | TEXT | Enum: 'inbox', 'todo', 'in_progress', 'waiting', 'done', 'cancelled' (default: 'inbox') |
| `priority` | TEXT | Enum: 'urgent', 'high', 'medium', 'low', 'none' (default: 'none') |
| `due_date` | TIMESTAMPTZ | Optional deadline |
| `assignee_id` | UUID | References profiles.id, who owns this task |
| `creator_id` | UUID | References profiles.id, who created it |
| `source_type` | TEXT | Enum: 'manual', 'email', 'meeting', 'briefing' |
| `source_id` | UUID | References sources.id (what created this task) |
| `confidence_score` | NUMERIC(3,2) | 0.0-1.0, AI confidence in extraction (NULL for manual) |
| `needs_review` | BOOLEAN | Flag for uncertain AI extractions (default: false) |
| `position` | INTEGER | Sort order within status/project (default: 0) |
| `completed_at` | TIMESTAMPTZ | When task was marked done |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on modification |

**Status Flow:**

```
inbox → todo → in_progress ↘
                             → done (or cancelled)
        ↓
      waiting (blocked on something)
```

**RLS Policies:**

- SELECT/INSERT/UPDATE/DELETE: Workspace members only

**Indexes:**

- `idx_tasks_workspace_id`: Primary lookup
- `idx_tasks_project_id`: Filter by project
- `idx_tasks_status`: Critical for dashboard queries
- `idx_tasks_priority`: Filter by urgency
- `idx_tasks_due_date`: Upcoming tasks
- `idx_tasks_assignee_id`: User's tasks
- `idx_tasks_source_id`: Track AI extractions
- `idx_tasks_needs_review`: QA workflow
- `idx_tasks_fts`: Full-text search GIN index on title + description

**Triggers:**

- `update_tasks_updated_at`: Auto-update timestamp

**Notes:**

- AI extraction creates tasks with `source_type='email'`, `confidence_score`, and `needs_review=true` if uncertain
- Tasks can be linked to tags via `task_tags` junction table

---

### task_tags

Junction table for many-to-many relationship between tasks and tags.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `task_id` | UUID | References tasks.id, ON DELETE CASCADE |
| `tag_id` | UUID | References tags.id, ON DELETE CASCADE |

**Primary Key:** `(task_id, tag_id)`

**RLS Policies:**

- SELECT/INSERT: Only for tasks in user's workspaces

---

### briefing_preferences

User preferences for daily AI-generated briefings.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `user_id` | UUID | References profiles.id, ON DELETE CASCADE |
| `delivery_time` | TIME | Time of day to deliver briefing (default: '07:00') |
| `timezone` | TEXT | IANA timezone (default: 'America/New_York') |
| `enabled` | BOOLEAN | Whether briefing is active (default: true) |
| `include_email` | BOOLEAN | Include email-sourced tasks (default: true) |
| `filters` | JSONB | Custom filters: {projects: [], statuses: [], priorities: [], tags: []} |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on modification |

**Constraints:**

- `UNIQUE(workspace_id, user_id)`: One preference set per user per workspace

**RLS Policies:**

- SELECT: Users can read own and workspace's preferences
- UPDATE: Users can only update their own
- INSERT: Users can only create for themselves

**Indexes:**

- `idx_briefing_preferences_workspace_id`: For briefing generation jobs
- `idx_briefing_preferences_user_id`: User lookups

**Triggers:**

- `update_briefing_preferences_updated_at`: Auto-update timestamp

---

### briefings

Stores generated daily briefing snapshots.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `user_id` | UUID | References profiles.id, ON DELETE CASCADE |
| `date` | DATE | Briefing date (YYYY-MM-DD) |
| `content` | JSONB | Structured briefing data: {summary, tasks: [], stats: {}, schedule: []} |
| `feedback` | TEXT | Enum: 'thumbs_up', 'thumbs_down' (NULL = no feedback) |
| `feedback_notes` | TEXT | User comments on briefing quality |
| `created_at` | TIMESTAMPTZ | When briefing was generated |

**Constraints:**

- `UNIQUE(workspace_id, user_id, date)`: One briefing per user per day

**Content Structure Example:**

```json
{
  "summary": "You have 5 overdue tasks and 12 due today",
  "tasks": [
    {
      "id": "uuid",
      "title": "Fix login bug",
      "priority": "urgent",
      "due": "2025-01-15"
    }
  ],
  "schedule": [
    {
      "start": "10:00",
      "end": "11:00",
      "title": "Team standup",
      "source": "calendar"
    }
  ],
  "stats": {
    "completed_today": 3,
    "in_progress": 5,
    "overdue": 2
  }
}
```

**RLS Policies:**

- SELECT: Users can only read their own briefings
- UPDATE: Users can update their own (feedback)
- INSERT: System can create (from scheduled jobs)

**Indexes:**

- `idx_briefings_workspace_id`: Workspace lookup
- `idx_briefings_user_id`: User lookup
- `idx_briefings_date`: Historical queries

---

### email_scan_configs

Configuration for email account scanning and task extraction.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `user_id` | UUID | References profiles.id, ON DELETE CASCADE |
| `provider` | TEXT | Enum: 'gmail', 'outlook' |
| `access_token_encrypted` | TEXT | OAuth access token (encrypted in production) |
| `refresh_token_encrypted` | TEXT | OAuth refresh token (encrypted) |
| `enabled` | BOOLEAN | Whether scanning is active (default: false) |
| `scan_interval_hours` | INTEGER | How often to scan (default: 3) |
| `quiet_hours_start` | TIME | Don't scan before this time |
| `quiet_hours_end` | TIME | Don't scan after this time |
| `weekend_scan` | BOOLEAN | Whether to scan on weekends (default: false) |
| `confidence_threshold` | NUMERIC(3,2) | Min AI confidence to auto-create tasks (default: 0.7) |
| `last_scan_at` | TIMESTAMPTZ | Timestamp of last successful scan |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on modification |

**Constraints:**

- `UNIQUE(workspace_id, user_id, provider)`: One config per email provider per user
- `confidence_threshold`: Must be between 0 and 1

**RLS Policies:**

- SELECT/INSERT/UPDATE: Users can only access own configs

**Indexes:**

- `idx_email_scan_configs_workspace_id`: For scheduled scan jobs
- `idx_email_scan_configs_user_id`: User lookup
- `idx_email_scan_configs_enabled`: Find active scanners

**Triggers:**

- `update_email_scan_configs_updated_at`: Auto-update timestamp

**Security Notes:**

- Tokens should be encrypted at rest using a key management service
- RLS ensures users only see their own tokens
- Consider implementing token rotation strategy

---

### email_scan_logs

Audit trail for email scanning jobs.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `config_id` | UUID | References email_scan_configs.id, ON DELETE CASCADE |
| `started_at` | TIMESTAMPTZ | Job start time |
| `completed_at` | TIMESTAMPTZ | Job completion (NULL if still running) |
| `emails_scanned` | INTEGER | Count of emails processed |
| `tasks_created` | INTEGER | Tasks auto-created from emails |
| `tasks_review` | INTEGER | Tasks created but flagged for review |
| `errors` | JSONB | Error details if scan failed |
| `status` | TEXT | Enum: 'running', 'completed', 'failed' |

**RLS Policies:**

- SELECT: Users can read logs for their own configs

**Indexes:**

- `idx_email_scan_logs_config_id`: Filter by config
- `idx_email_scan_logs_started_at`: Time-based queries

---

### audit_logs

Comprehensive action logging for compliance, debugging, and analytics.

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `user_id` | UUID | References profiles.id, ON DELETE SET NULL (user may be deleted) |
| `entity_type` | TEXT | 'task', 'project', 'source', 'workspace_member', etc. |
| `entity_id` | UUID | ID of the affected entity |
| `action` | TEXT | 'created', 'updated', 'deleted', 'extracted', 'reviewed' |
| `details` | JSONB | What changed: {old_status: '...', new_status: '...'} |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |

**Usage Examples:**

```json
{
  "entity_type": "task",
  "entity_id": "uuid-of-task",
  "action": "updated",
  "details": {
    "changed_fields": {
      "status": ["inbox", "todo"],
      "priority": ["none", "high"]
    }
  }
}
```

**RLS Policies:**

- SELECT: Workspace members can read logs
- INSERT: System can create (from triggers)

**Indexes:**

- `idx_audit_logs_workspace_id`: Workspace-scoped queries
- `idx_audit_logs_entity_type`: Filter by entity
- `idx_audit_logs_entity_id`: Track specific entity
- `idx_audit_logs_user_id`: Track user actions
- `idx_audit_logs_created_at`: Time-based queries

---

### notifications

Real-time notifications for users (task assignments, briefing ready, etc.).

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | References workspaces.id, ON DELETE CASCADE |
| `user_id` | UUID | References profiles.id, ON DELETE CASCADE |
| `type` | TEXT | Enum: 'task_assigned', 'briefing_ready', 'scan_complete', 'review_needed' |
| `title` | TEXT | Notification headline |
| `message` | TEXT | Detailed message |
| `read` | BOOLEAN | Has user read it (default: false) |
| `action_url` | TEXT | Deep link to related entity |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |

**RLS Policies:**

- SELECT: Users can only read own notifications
- UPDATE: Users can mark own as read
- INSERT: System can create

**Indexes:**

- `idx_notifications_user_id`: User's notifications
- `idx_notifications_read`: Unread count queries
- `idx_notifications_created_at`: Recent notifications
- `idx_notifications_workspace_id`: Workspace context

---

## Helper Functions

### is_workspace_member(ws_id UUID) → BOOLEAN

Checks if the current user is a member of the specified workspace.

**Usage in RLS Policies:**

```sql
WHERE public.is_workspace_member(workspace_id)
```

**Implementation:**

```sql
SELECT EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid()
)
```

---

### get_user_workspaces(user_uuid UUID)

Returns all workspaces a user is a member of, ordered by creation date.

**Returns:**
| id | name | slug | owner_id | settings | created_at | updated_at |
|---|---|---|---|---|---|---|

**Usage:**

```sql
SELECT * FROM public.get_user_workspaces(auth.uid());
```

---

### search_tasks(ws_id UUID, query_text TEXT)

Full-text search across task titles and descriptions.

**Returns:**
| id | title | description | status | priority | relevance |
|---|---|---|---|---|---|

**Usage:**

```sql
SELECT * FROM public.search_tasks('workspace-uuid', 'fix login bug');
```

**Implementation Notes:**

- Uses PostgreSQL built-in `tsvector` and `tsquery`
- Results ranked by relevance score
- Returns top matches first

---

## Triggers and Automation

### Auto-Update Timestamps

All tables with `updated_at` columns automatically update on modification:

- profiles
- workspaces
- projects
- tasks
- briefing_preferences
- email_scan_configs

**Function:** `update_updated_at_column()`

---

### Auto-Create Profile on Signup

When a new user signs up via Supabase Auth:

**Trigger:** `create_profile_on_auth_user_insert`
**Action:** Inserts a new profile with the user's ID and email

```sql
INSERT INTO profiles (id, email)
VALUES (new_auth_user.id, new_auth_user.email);
```

---

### Auto-Create Workspace Owner

When a workspace is created:

**Trigger:** `create_workspace_owner_on_workspace_insert`
**Action:** Adds the workspace owner to `workspace_members` with role='owner'

```sql
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES (new_workspace.id, new_workspace.owner_id, 'owner');
```

---

## Row-Level Security (RLS) Overview

All tables have RLS enabled. Core security model:

1. **Workspace Boundary:** `is_workspace_member(workspace_id)` checks
2. **User Isolation:** Users can only see their own profiles, configs, preferences
3. **Admin Roles:** Admins/owners have elevated permissions
4. **System Access:** Certain operations (like creating briefings) bypass user checks

**Example RLS Policy:**

```sql
CREATE POLICY "Workspace members can read tasks"
  ON tasks FOR SELECT
  USING (is_workspace_member(workspace_id));
```

---

## Indexing Strategy

Strategic indexing balances query performance with write overhead:

### High-Traffic Indexes (Always Needed)

- `workspace_id` on all workspace-scoped tables
- `user_id` on user-scoped tables (notifications, preferences)
- `status` on tasks (critical for dashboard)
- `priority` on tasks (filtering)

### Query-Specific Indexes

- `due_date` on tasks (upcoming/overdue queries)
- `created_at` on briefings, audit_logs (time-series)
- `external_id` on sources (deduplication)

### Full-Text Search

- GIN index on tasks using `to_tsvector('english', title || description)`

---

## Multi-Tenancy Implementation

The database enforces multi-tenancy at the SQL level:

1. **Workspace Isolation:** Every data table references `workspace_id`
2. **RLS Policies:** Enforce membership checks before any query
3. **Cascading Deletes:** `ON DELETE CASCADE` from workspace → child tables
4. **No Cross-Workspace Queries:** Impossible to query across workspaces without explicit UNION

**Implications:**

- Workspace deletion safely removes all child data
- User deletion gracefully handled (SET NULL on creator_id)
- No accidental data leakage between workspaces

---

## Data Migration Considerations

### Encryption

- `email_scan_configs` tokens are marked as encrypted, but actual encryption must be implemented at the application layer
- Consider using AWS KMS, Vault, or similar

### JSONB Fields

These support arbitrary JSON structures and can evolve without schema changes:

- `workspaces.settings`: UI themes, feature flags, integrations
- `sources.metadata`: Email headers, meeting details
- `briefings.content`: Structured daily summary
- `briefing_preferences.filters`: Query parameters
- `audit_logs.details`: Change tracking

### Temporal Data

- `completed_at` tracks task completion time
- `processed_at` on sources tracks AI processing
- `last_scan_at` on email configs prevents duplicate scans
- Timestamps are in UTC (TIMESTAMPTZ)

---

## Performance Considerations

### Query Patterns to Optimize For

1. User's task inbox: `WHERE workspace_id = ? AND status = 'inbox'`
2. Overdue tasks: `WHERE workspace_id = ? AND due_date < NOW()`
3. Daily briefing assembly: `WHERE workspace_id = ? AND (status != 'done' AND status != 'cancelled')`
4. Full-text search: Text search across large task sets

### Monitoring

- Monitor `email_scan_logs` for scan duration trends
- Track `audit_logs` cardinality (grows ~10K/month in typical use)
- Watch `tasks` table growth (largest table, should benefit from workspace partitioning at scale)

### Scaling Considerations

At 1M+ tasks, consider:

- Partitioning `tasks` by `workspace_id`
- Archiving old `audit_logs` to cold storage
- Caching `workspace_members` in application layer

---

## Security Best Practices

1. **Never expose tokens**: `access_token_encrypted` and `refresh_token_encrypted` should never be selected or logged
2. **Audit trail**: All mutations create audit_log entries for compliance
3. **User verification**: Critical RLS policies use `auth.uid()` for authorization
4. **Rate limiting**: Implement at application layer (email scanning, notifications)
5. **Data retention**: Consider GDPR/CCPA requirements for audit logs and briefing history

---

## Extension Requirements

```sql
-- UUID generation
CREATE EXTENSION uuid-ossp;

-- Fuzzy text search and trigram matching
CREATE EXTENSION pg_trgm;
```

These are required for the full-text search functionality and UUID primary keys.
