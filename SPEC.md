# Ultimate To-Do OS - Product Specification

## 1. Product Definition

**Product Name:** Ultimate To-Do OS

**Tagline:** The task management system built for people who run multiple businesses.

**Value Proposition:**
The first task management system designed specifically for multi-business entrepreneurs, solopreneurs, and portfolio operators. Automatically converts emails and meetings into organized, prioritized action items across all your ventures. Provides daily briefings tailored to each business context, commitment tracking across all roles, and one unified place to manage tasks that span multiple companies, projects, and timelines.

**Target User Persona:**

- Multi-business entrepreneurs (startup founders who run multiple companies)
- Portfolio operators (angels, board members managing multiple companies)
- Solopreneurs (consultants, fractional executives running multiple ventures)
- Anyone managing tasks across 2+ distinct business contexts
- People who want AI-powered email and meeting extraction without manual data entry

**Jobs to Be Done:**

1. Capture and organize action items from multiple email accounts and meetings
2. Switch context between different businesses without losing focus
3. Prioritize and decide what to do today across all businesses
4. Track commitments made in different roles and stay accountable
5. Review weekly and monthly progress across all ventures
6. Delegate and track follow-ups across multiple teams

**Non-Goals:**

- NOT a project management tool (Asana/Monday.com territory)
- NOT a CRM (Salesforce/HubSpot territory)
- NOT a calendar/scheduling app (Google Calendar territory)
- NOT a note-taking system (Notion/Obsidian territory)
- NOT a financial/accounting tool

## 2. MVP Scope

| Feature                 | Category     | Description                                          |
| ----------------------- | ------------ | ---------------------------------------------------- |
| Task CRUD               | Must Have    | Create, read, update, delete, complete tasks         |
| Multi-Workspace         | Must Have    | Separate task spaces for each business               |
| Inbox View              | Must Have    | All extracted/new tasks in one place before triage   |
| Today View              | Must Have    | Today's tasks filtered by workspace                  |
| Email Connection        | Must Have    | Connect Gmail account for task extraction            |
| Email Scanning          | Must Have    | Scheduled background scan of emails for action items |
| Daily Briefing          | Must Have    | AI-generated morning briefing of top priorities      |
| Review Queue            | Must Have    | Human-in-the-loop approval of extracted tasks        |
| Task Status Workflow    | Must Have    | New → Ready → In Progress → Done                     |
| Search                  | Should Have  | Full-text search across tasks                        |
| Due Date Management     | Should Have  | Set and filter by due dates                          |
| Task Tagging            | Should Have  | Organize tasks with custom tags                      |
| Quick Capture           | Should Have  | Email → task creation without leaving inbox          |
| Email Scanning Config   | Should Have  | Control which emails to scan, scan frequency         |
| Weekly Review Interface | Nice to Have | Guided weekly planning session                       |
| Mobile Web              | Nice to Have | Responsive design for mobile browsers                |

## 3. V1 and V2 Roadmap

### V1 (Weeks 0-12): Core Task Management + Email Extraction + Daily Briefings

**Features:**

- Multi-workspace task management
- Inbox → Today workflow
- Gmail connection and email scanning
- Review queue with human approval
- Daily AI-generated briefings
- Email scan scheduling (3-hour default)
- Task status tracking (New → Ready → In Progress → Done)
- Search functionality
- Tag-based organization

**Kill Criteria:**

- Cannot scale to 10,000+ tasks per user
- Email scan accuracy below 70%
- Daily briefing takes >5 seconds to generate
- User abandonment rate >40% after first week

### V2 (Weeks 12-24): Advanced Features + Mobile

**Features:**

- Calendar integration (Google Calendar read-only)
- Commitment tracking across workspaces
- Role-based task lenses (view by role)
- Meeting extraction from calendar
- Weekly review workflow
- Mobile app (React Native or PWA)
- Collaborative workspaces (beta)
- Auto-generated follow-up drafts
- Meeting-to-execution scoreboard

**Kill Criteria:**

- Calendar API integration takes >2 minutes per user
- Role-based filtering adds >500ms latency
- Mobile app retention worse than web after 2 weeks

## 4. Core Objects & Data Model

### Entities

**Task**

- id (uuid, primary key)
- workspace_id (fk to workspace)
- title (text, required)
- description (text)
- status (enum: new, ready, in_progress, done)
- created_at (timestamp)
- completed_at (timestamp)
- due_date (timestamp)
- priority (enum: low, medium, high)
- assigned_to (fk to user)
- source (enum: manual, email, calendar, quick_capture)
- source_id (text, external reference)
- created_from_email_id (fk to email source)
- updated_at (timestamp)

**Project**

- id (uuid, primary key)
- workspace_id (fk to workspace)
- name (text, required)
- description (text)
- color (text)
- archived (boolean)
- created_at (timestamp)
- updated_at (timestamp)

**Workspace**

- id (uuid, primary key)
- owner_id (fk to user)
- name (text, required)
- slug (text, unique per owner)
- description (text)
- is_default (boolean)
- created_at (timestamp)
- updated_at (timestamp)

**User/Profile**

- id (uuid, primary key)
- email (text, unique)
- name (text)
- avatar_url (text)
- timezone (text, default: UTC)
- daily_briefing_time (time)
- email_on_updates (boolean)
- created_at (timestamp)
- updated_at (timestamp)

**Source**

- id (uuid, primary key)
- user_id (fk to user)
- type (enum: gmail, calendar, manual, slack)
- external_id (text)
- refresh_token (encrypted)
- access_token (encrypted)
- last_synced_at (timestamp)
- status (enum: active, paused, error)
- sync_interval_hours (integer, default: 3)
- created_at (timestamp)
- updated_at (timestamp)

**Tag**

- id (uuid, primary key)
- workspace_id (fk to workspace)
- name (text)
- color (text)
- created_at (timestamp)

**Task_Tag (junction table)**

- task_id (fk to task)
- tag_id (fk to tag)

**Briefing**

- id (uuid, primary key)
- user_id (fk to user)
- workspace_id (fk to workspace)
- date (date)
- top_3_outcomes (json array)
- must_do_list (json array)
- waiting_on_items (json array)
- defer_suggestions (json array)
- generated_at (timestamp)
- opened_at (timestamp)
- clicked_links (json)

**BriefingPreference**

- id (uuid, primary key)
- user_id (fk to user)
- workspace_id (fk to workspace)
- enabled (boolean, default: true)
- send_time (time)
- send_days (text array)
- quiet_hours_start (time)
- quiet_hours_end (time)
- max_items_per_section (integer, default: 5)
- include_waiting_on (boolean, default: true)
- include_defer_suggestions (boolean, default: true)
- updated_at (timestamp)

**EmailScanConfig**

- id (uuid, primary key)
- workspace_id (fk to workspace)
- user_id (fk to user)
- enabled (boolean, default: true)
- scan_interval_hours (integer, default: 3)
- next_scan_at (timestamp)
- last_scan_at (timestamp)
- error_message (text)
- scanned_email_count (integer)
- created_tasks_count (integer)
- created_at (timestamp)
- updated_at (timestamp)

**AuditLog**

- id (uuid, primary key)
- user_id (fk to user)
- workspace_id (fk to workspace)
- action (text)
- entity_type (text)
- entity_id (uuid)
- changes (json)
- created_at (timestamp)

**Notification**

- id (uuid, primary key)
- user_id (fk to user)
- type (enum: task_created, task_completed, briefing_ready, email_scanned)
- title (text)
- message (text)
- data (json)
- read (boolean, default: false)
- created_at (timestamp)
- read_at (timestamp)

### Key Relationships

- User → Workspaces (one-to-many)
- Workspace → Tasks (one-to-many)
- Workspace → Projects (one-to-many)
- Task → Tags (many-to-many)
- User → Sources (one-to-many, OAuth connections)
- Task → Briefing references (one-to-many)
- User → Notifications (one-to-many)

## 5. Key Workflows (User Stories)

### US-01: Manual Task Creation

**As a** user
**I want to** create a task manually in my workspace
**So that** I can capture ideas and action items

**Acceptance Criteria:**

- Can create task with title, description, due date, priority
- Task appears in Inbox and Today views
- Can assign to project and add tags
- Created task has status "new"

### US-02: Task Triage from Inbox

**As a** user
**I want to** review extracted tasks and decide what to do
**So that** I have high-quality tasks to execute

**Acceptance Criteria:**

- Can view all new tasks in Inbox
- Can mark as "ready" to move to Today view
- Can edit extracted task title and description
- Can delete incorrect extractions
- Can see original email or meeting source

### US-03: Switch Between Businesses

**As a** multi-business entrepreneur
**I want to** switch between my different workspaces
**So that** I stay focused on one business context at a time

**Acceptance Criteria:**

- Quick workspace switcher in header
- Today view filters by current workspace
- Dashboard shows stats per workspace
- Can have different email scans per workspace

### US-04: Email Scan Creates Tasks

**As a** user
**I want to** have my emails automatically scanned for action items
**So that** I don't miss tasks buried in email threads

**Acceptance Criteria:**

- Can connect Gmail account with OAuth
- System scans emails every 3 hours (configurable)
- Identifies action items like "please send...", "can you...", "follow up on..."
- Creates tasks with source attribution to original email
- Confidence scoring prevents low-quality extractions

### US-05: Review and Approve Extracted Tasks

**As a** user
**I want to** review extracted tasks before they appear in my workflow
**So that** I maintain high quality and don't get overwhelmed

**Acceptance Criteria:**

- New extracted tasks go to Review Queue first
- Can view 5-10 pending approvals at once
- Can approve, edit, or delete before moving to Inbox
- Can set rules to auto-approve high-confidence extractions

### US-06: Generate Morning Briefing

**As a** user
**I want to** receive a daily AI-generated briefing of my priorities
**So that** I start my day with clarity on what matters most

**Acceptance Criteria:**

- Briefing generated at configurable time each morning
- Includes: top 3 outcomes, must-do list, waiting-on items
- Considers deadlines, priorities, and calendar conflicts
- Available in-app and via email
- Can see historical briefings for review

### US-07: Complete Daily Workflow

**As a** user
**I want to** mark tasks as done and track progress
**So that** I can celebrate wins and maintain momentum

**Acceptance Criteria:**

- Can mark task as "in_progress" or "done"
- Completed tasks show completion timestamp
- Can see streak of completed tasks
- Can see completion rate by workspace

### US-08: Weekly Review

**As a** user
**I want to** review the past week and plan next week
**So that** I stay on track with my commitments

**Acceptance Criteria:**

- Guided weekly review interface on Sunday evening
- Shows completed tasks, missed deadlines, commitments
- Can reschedule incomplete tasks
- Generates next week's priority themes
- Available as report or interactive experience

### US-09: Configure Email Scanning

**As a** user
**I want to** control which emails get scanned and how often
**So that** I can optimize accuracy and frequency

**Acceptance Criteria:**

- Can set scan interval (3-24 hours)
- Can exclude specific senders or labels
- Can view scan history and error logs
- Can set quiet hours (no scanning 9pm-6am)
- Can manually trigger immediate scan

### US-10: Quick Email Capture

**As a** user
**I want to** quickly turn an email into a task without leaving Gmail
**So that** I capture important emails without friction

**Acceptance Criteria:**

- Gmail extension adds "Add to To-Do OS" button
- Can add task with one click
- Can pre-fill workspace and project
- Task appears in app immediately

### US-11: Project Organization

**As a** user
**I want to** organize tasks into projects within my workspace
**So that** I can group related work

**Acceptance Criteria:**

- Can create projects per workspace
- Can assign tasks to projects
- Can view tasks by project
- Can archive completed projects

### US-12: Commitment Tracking

**As a** user
**I want to** track commitments I've made across my different roles
**So that** I stay accountable and don't over-commit

**Acceptance Criteria:**

- Can mark tasks as commitments to others
- Can track by person/team/deadline
- Weekly briefing includes "commitments due this week"
- Can see commitment fulfillment rate
- Can see who I'm most frequently delaying on

## 6. Daily Morning Briefing System

### Briefing Generation Process

**Trigger:** Daily at user's configured time (default 7:00 AM in their timezone)

**Inputs:**

1. **Tasks:** All tasks in current workspace with status ready/in_progress for this week
2. **Calendar:** 7-day look-ahead from Google Calendar (if connected)
3. **Due Dates:** Tasks due today, tomorrow, this week, overdue
4. **Priorities:** High-priority tasks weighted higher
5. **Historical Patterns:** User's typical completion rate, patterns from past briefings

**Outputs:**

1. **Top 3 Outcomes**
   - 3 specific, achievable outcomes for the day
   - Phrased as "If I accomplish X, my day is successful"
   - Chosen by combining due dates, priorities, and estimated effort
   - Must be completable in 8-hour work day

2. **Must-Do List**
   - 5-10 tasks that MUST be done today
   - Include: commitments to others, hard deadlines, blockers for teammates
   - Ordered by urgency and impact

3. **Waiting-On Items**
   - Tasks blocked on dependencies or awaiting responses
   - Show who task is waiting on and since when
   - Suggest follow-up actions

4. **Defer Suggestions**
   - Low-priority tasks suggested to be moved to later dates
   - Tasks with flexible deadlines or lower impact
   - Help with focus management

**Personalization:**

- Workspace context (briefing per workspace or consolidated)
- Time-of-day adjustments (early bird vs night owl)
- Async vs synchronous work patterns
- Team timezone overlap considerations

**Delivery Channels:**

1. In-app: Dashboard widget, dedicated briefing page
2. Email: HTML-formatted briefing email (if opted in)
3. Slack: Daily briefing message (future)

**Feedback Loop:**

- Track: Did user complete the top 3 outcomes?
- Learn: Adjust future recommendations based on completion
- Adapt: If user never completes outcome 3, suggest simpler outcomes

**Metrics:**

- Briefing open rate
- Click-through rate on tasks
- Completion rate of recommended tasks
- User feedback/rating

## 7. Email + Meeting Extraction

### Email Extraction Pipeline

**Stage 1: Connect**

- User authorizes Gmail with OAuth (minimal scope: read:email, read:labels)
- Store refresh token in encrypted field
- Verify connection works

**Stage 2: Scan**

- Scheduled every 3 hours (configurable per workspace)
- Query Gmail API: modified after last sync timestamp
- Skip archived, spam, trash emails
- Apply user-configured filters (exclude senders, labels)
- Rate limit: 50 emails per scan, paginate if needed

**Stage 3: Extract**

- Send email to Claude API with prompt:
  - "Extract action items from this email"
  - "Return JSON: [{title, description, priority, due_date_hint, assigned_to_hint}]"
  - Max 3 action items per email
- Parse Claude response
- Validate: title required, description optional

**Stage 4: Score**

- Confidence scoring rules:
  - **95-100%:** "Please send me...", "Can you do...", "Follow up on..."
  - **80-94%:** Assigned to user by name, dated request, explicit deadline
  - **60-79%:** Questions directed at user, decisions needed
  - **<60%:** Mentions of problems, discussions without clear action
- Filter out low confidence (<60%) unless user enabled aggressive mode

**Stage 5: Triage**

- High confidence (>85%): Auto-create as "new" in Inbox
- Medium confidence (60-85%): Go to Review Queue for approval
- Low confidence (<60%): Discard or archive for manual review

**Stage 6: Create/Review**

- Create Task records with:
  - source: "email"
  - source_id: Gmail message ID
  - created_from_email_id: Reference to original
  - status: "new"
- Preserve email source link for context
- Deduplicate on exact title + workspace (don't create duplicates)

### Meeting Extraction (V2)

**Trigger:** 15 minutes after calendar event ends (if connected)

- Read Google Calendar event
- If meeting has notes or transcript, extract action items
- Same scoring and triage logic as email
- Flag decisions and commitments made in meeting

### Deduplication Logic

- Check if task with same title exists in same workspace within past 30 days
- If similar (>80% string match), link instead of creating new task
- Allow user to manually merge duplicates

### Rate Limiting & Throttling

- Gmail API: 100 requests/second per user
- Per-workspace: max 1000 emails scanned per day
- Exponential backoff on API errors
- Daily digest of extraction failures

## 8. Scheduled Email Scanning

**Default Interval:** 3 hours

**Per-Workspace Configuration:**

- Can set to 1, 3, 6, 12, or 24 hours
- More frequent scanning for critical workspaces
- Less frequent for archival/secondary businesses

**Timezone Awareness:**

- Scan time adjusted to user's timezone
- Quiet hours: configurable (default 9pm-6am)
- Skip scan during quiet hours even if interval expires

**Incremental Sync:**

- Last sync timestamp stored per workspace
- Only fetch emails since last sync
- Resume from checkpoint on error
- Keep last 90 days of email history

**Error Handling:**

- Exponential backoff on failed scans
- Alert user after 3 consecutive failures
- Log error details for debugging
- Pause scanning and notify if token expires
- Retry on network timeouts

**Monitoring:**

- Track scan duration (SLA: <30 seconds per workspace)
- Monitor extraction accuracy
- Alert on unusual activity (sudden spike in tasks)

## 9. Differentiators

### Top 5 Competitive Advantages

**1. Commitment Tracking**

- Track commitments across all your businesses and roles
- See which people/teams you're most frequently delaying on
- Weekly accountability view for commitment fulfillment
- Competitors: None do this well across multiple business contexts

**2. Role-Based Task Lenses**

- View tasks filtered by which role/business context they belong to
- Different task lists for "CEO of Company A" vs "Angel investor" vs "Consultant"
- Switch lenses throughout the day to stay in flow
- Competitors: None support this use case

**3. Calendar-Aware Briefings**

- Morning briefing considers calendar conflicts, time zones, meeting loads
- Suggests realistic outcomes based on actual availability
- Flags over-committed days proactively
- Competitors: Task managers are ignorant of calendar

**4. Auto-Generated Follow-Up Drafts**

- When task becomes overdue, AI drafts a follow-up email
- "It's been 5 days since you assigned John the analysis..."
- Pre-filled in Resend template, ready to send
- Competitors: No one generates these

**5. Meeting-to-Execution Scoreboard**

- Track decisions made in meetings and their execution
- See which decisions get implemented, which get abandoned
- Feedback loop for better decision-making
- Show follow-up rate per attendee
- Competitors: This is novel

## 10. Technical Architecture

**Frontend Stack:**

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- TanStack Query (data fetching)
- Zustand (state management)

**Backend Stack:**

- Next.js 15 API routes
- Supabase (PostgreSQL + RLS + Auth)
- Resend (transactional email)

**External Services:**

- Claude API (Anthropic) - Email/meeting extraction and briefing generation
- Gmail API (Google) - Email scanning and extraction
- Google Calendar API - Meeting sync (V2)
- Inngest - Scheduled tasks and background jobs
- Vercel - Hosting and deployment

**Database (Supabase):**

- PostgreSQL with Row-Level Security (RLS)
- Real-time subscriptions for task updates
- Full-text search on tasks
- Backup and replication included

**Background Jobs (Inngest):**

- Email scan scheduling (every 3 hours per workspace)
- Daily briefing generation (user-configured time)
- Deduplication of extracted tasks
- Follow-up reminder emails
- Weekly review digest

**Email Delivery (Resend):**

- Transactional emails: briefing, notifications, follow-ups
- HTML templates with custom branding
- Tracking: open rates, click rates
- Unsubscribe management

**Deployment:**

- Vercel (zero-config Next.js deployment)
- Environment: staging and production
- Auto-deploy on main branch
- Preview deployments for PRs

## 11. Security & Privacy

### Row-Level Security (RLS)

- All tables protected with RLS policies
- Users can only see their own workspaces and tasks
- Workspace admins can see all workspace tasks
- Service role used only for background jobs (Inngest)

### OAuth & Token Management

- Gmail OAuth: Read-only scopes only (metadata.readonly, messages.readonly)
- Refresh tokens stored encrypted in database
- Access tokens cached in memory (not persisted)
- Token expiration monitored; refresh before expiry
- Revocation supported when user disconnects account

### Email Content Security

- Email content never stored permanently
- Only extract action items, discard full email
- Sanitize extracted text (strip HTML, remove PII by default)
- Allow user to opt-in to store email content for search
- Email IDs stored, full content discarded after extraction

### API Security

- All API routes require authentication (Supabase session)
- Rate limiting on extraction endpoints (10 req/min per user)
- CORS restricted to frontend origin
- CSRF tokens on state-changing operations
- Input validation on all endpoints

### Audit Trails

- AuditLog table tracks all mutations
- User ID, action, entity, timestamp, changes stored
- Can replay user actions for debugging
- Retention: 1 year default

### GDPR Considerations

- Data export endpoint (JSON dump of user's tasks)
- Account deletion endpoint (cascades to all user data)
- Consent for email scanning (explicit opt-in)
- Privacy policy clearly states no email content storage
- DPA with Supabase (data processing in EU if configured)

## 12. Edge Cases

### Critical Edge Cases

**1. Empty Inbox**

- Briefing still generates with fewer items
- UI shows positive message ("Great focus day!" / "Enjoy your break")
- Suggests reviewing deferred items

**2. No Email Connected**

- App still works for manual task creation
- Briefing based on calendar + manual tasks only
- Gentle prompts to connect email

**3. Email API Rate Limits**

- Catch rate limit error, pause scanning
- Notify user: "Gmail scan paused, will resume in 1 hour"
- Exponential backoff up to 24 hours

**4. Duplicate Emails**

- Gmail refetches same email multiple times due to label changes
- Deduplication: store Gmail message ID, skip if seen
- Link duplicates instead of creating new tasks

**5. Timezone Changes**

- User travels, changes timezone in profile
- Recalculate briefing send times for new timezone
- Adjust due dates of "today" tasks
- Handle daylight saving time transitions

**6. Workspace With No Projects**

- UI handles gracefully (empty project list)
- Default project created on first task if none exists
- Can still organize with tags

**7. Deleted Project With Tasks**

- Option 1: Soft delete, archive project with tasks
- Option 2: Orphan tasks to workspace root
- Show warning before deletion

**8. Concurrent Edits**

- Last-write-wins for simple fields (title, description)
- Conflict resolution for status changes
- Real-time sync via Supabase subscriptions
- UI shows "updated by X" indicator

**9. Very Long Email Threads**

- Truncate at 50KB for API call
- Summarize thread context
- Link to full email in Gmail

**10. Malformed Emails**

- HTML-only emails without text alternative
- Binary attachments
- Encoding issues (weird charsets)
- Claude API gracefully returns empty extraction if unparseable

**11. Token Expiry**

- Refresh token stored, refresh 5 minutes before expiry
- If refresh fails, alert user to re-authorize
- Graceful degradation: stop email scanning, keep app functional

**12. Scan During Quiet Hours**

- Skip scheduled scan if in quiet hours
- Resume after quiet hours end
- Don't push notifications during quiet hours

**13. User in Multiple Timezones**

- Workspace in one timezone, user traveling in another
- Briefing sends at workspace time, not user time
- Config option to always use user timezone

**14. 1000+ Tasks Performance**

- Index on workspace_id, status, due_date
- Pagination: fetch 50 tasks per request
- Full-text search limited to workspace scope
- Archive old completed tasks (>90 days)

**15. Briefing With No Tasks**

- Show friendly message
- Suggest: "Want to add a task? Click here."
- Still show calendar overview

**16. Email Extraction Hallucination**

- Claude makes up action items that don't exist
- Mitigation: Confidence scoring filters >50% noise
- Low confidence items go to Review Queue
- User feedback: "This task isn't in the email" → improves prompting

**17. Deleted Task Recovery**

- Soft delete pattern: marked deleted, not removed
- Recover from trash for 30 days
- Hard delete after 30 days (batch job)

**18. User Deletes Workspace While Email Scan in Progress**

- Background job checks workspace exists before creating tasks
- Gracefully skip extraction if workspace deleted
- Notify user if scan fails

## 13. Success Metrics

### Activation

- **Goal:** 70% of signups create at least 5 tasks in first week
- **Metric:** User creates 5+ tasks within 7 days
- **Success threshold:** >70% of activated users

### Retention

- **Goal:** 40% of activated users active 4+ weeks later
- **Metric:** Weekly active users / new users 4 weeks ago
- **Success threshold:** >40% WAU/MAU ratio

### Engagement

**Email Extraction:**

- **Goal:** Email scan → task approval rate >75%
- **Metric:** (Tasks approved / Total extracted) × 100
- **Success threshold:** >75%

**Briefing:**

- **Goal:** >60% daily briefing open rate
- **Metric:** Briefing opened / Briefing sent
- **Success threshold:** >60% open rate

**Task Completion:**

- **Goal:** >50% task completion rate
- **Metric:** (Completed tasks / Total tasks) × 100
- **Success threshold:** >50%

### Precision

- **Goal:** >85% extraction accuracy
- **Metric:** Manual review: is extracted task a valid action item?
- **Success threshold:** >85% of extracted tasks are valid

### User Satisfaction

- **Goal:** NPS >40
- **Metric:** "How likely would you recommend..." (0-10)
- **Success threshold:** NPS >40

## 14. Build Plan

### Sprint 0 (Week 0): Foundation

- [ ] Database schema created in Supabase
- [ ] User authentication setup (Supabase Auth)
- [ ] RLS policies for all tables
- [ ] Basic layout with header, nav, workspace switcher
- [ ] Deployment pipeline (Vercel)

### Sprint 1 (Week 1-2): Task CRUD & Inbox

- [ ] Task creation form
- [ ] Inbox view with task list
- [ ] Task details sidebar
- [ ] Update task title/description/due date
- [ ] Delete tasks (soft delete)
- [ ] Task search
- [ ] Status transitions (new → ready)

### Sprint 2 (Week 3-4): Today View & Projects

- [ ] Today view (workspace-filtered tasks)
- [ ] Project management (create, edit, delete)
- [ ] Assign tasks to projects
- [ ] Task filtering by project
- [ ] Tags functionality
- [ ] Mark tasks complete

### Sprint 3 (Week 5-6): Email Integration

- [ ] Gmail OAuth connection
- [ ] Email scanning pipeline
- [ ] Claude API integration for extraction
- [ ] Review Queue for approvals
- [ ] Confidence scoring
- [ ] Email source linking

### Sprint 4 (Week 7-8): Daily Briefings

- [ ] Briefing generation algorithm
- [ ] Briefing display in-app
- [ ] Briefing email delivery (Resend)
- [ ] User preferences (time, timezone, quiet hours)
- [ ] Briefing history and feedback

### Sprint 5+ (Week 9+): Polish & V2 Planning

- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] Mobile responsiveness
- [ ] Documentation
- [ ] Plan V2 features
