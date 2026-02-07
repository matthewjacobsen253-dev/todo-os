# Daily Briefing System Documentation

## Overview

The briefing system generates personalized daily overviews that help users focus on what matters most. It analyzes your tasks, priorities, and deadlines to create an actionable morning briefing.

## How Briefings Are Generated

### Generation Process

```
Collect Input Data
    ↓
Filter & Prioritize
    ↓
Identify Outcomes
    ↓
Highlight Urgencies
    ↓
Detect Blockers
    ↓
Suggest Deferrals
    ↓
Format & Deliver
```

### Timing

- **Default Delivery**: 8:00 AM (user's timezone)
- **Customizable**: Any hour of the day
- **Frequency**: Once per day (per user)
- **Generation**: Triggered on-demand or scheduled via cron job

## Input Data Sources

### 1. Tasks

- **Status**: Only non-completed tasks (todo, in_progress, waiting)
- **Filters**: Project, tag, and priority filters from user preferences
- **Sorting**: By priority, due date, and creation date

### 2. Projects

- **Active Projects**: Only "active" projects included
- **Context**: Project color, icon, and name provide visual context
- **Counting**: Task counts per project included in summary

### 3. Due Dates & Deadlines

- **Today**: Tasks due today marked as "Must Do Today"
- **Overdue**: Tasks past due highlighted with days overdue
- **This Week**: Future deadlines provide forward planning
- **Calendar Events**: Optional integration with calendar invites

### 4. Collaboration Context

- **Assigned To You**: High priority
- **Waiting On Others**: Shows blockers that need follow-ups
- **Mentioned In Comments**: Tasks you're mentioned in

### 5. Historical Data

- **Completion Rate**: Yesterday's progress informs today's suggestions
- **Deferral History**: Previously deferred tasks get flagged
- **Feedback**: User preferences from past briefings improve future ones

## Output Structure

```typescript
interface BriefingContent {
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
    reason: string;  // Why defer: "Not due this week", "Low priority", etc.
  }>;

  waiting_on: Array<{
    task_id: string;
    title: string;
    waiting_for: string;  // Person or resource
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
```

## Generation Algorithm

### Step 1: Top 3 Outcomes

Selects 3 most important tasks:

```
1. Filter by priority (urgent > high > medium)
2. Prioritize tasks due today
3. Prioritize tasks with external deadlines
4. Take top 3 by score
5. Randomize within same priority level (prevents monotony)
```

### Step 2: Must Do Today

Tasks that absolutely must be done today:

```
1. Tasks with due_date = today
2. Tasks with due_date = yesterday (overdue)
3. Tasks marked as urgent
4. Tasks assigned by manager/VIP
5. Limit to 5 items (not overwhelming)
```

### Step 3: Waiting On

Identifies blocker situations:

```
1. Tasks with status = 'waiting'
2. Filter by assignment or mentions
3. Group by person waiting on
4. Suggest follow-up actions
```

### Step 4: Defer Suggestions

Identifies tasks that can be deferred:

```
1. Tasks not due this week
2. Low priority tasks
3. Previously deferred items (show pattern)
4. Tasks not assigned to high-priority projects
5. Include reasoning for user education
```

### Step 5: Overdue Items

Highlights pressing late items:

```
1. Tasks with due_date < today
2. Sort by days overdue (most urgent first)
3. Calculate days_overdue
4. Mark very late (7+ days) as critical
```

### Step 6: Summary Stats

Quick metrics:

```
total_tasks = count of all non-completed tasks
urgent_count = count of urgent + high priority
completed_today = count of tasks completed in last 24h
```

## Personalization

### User Preferences

Stored in `BriefingPreference`:

```typescript
interface BriefingFilters {
  projects?: string[];              // Only show these projects
  priorities?: TaskPriority[];       // Minimum priority level
  include_completed?: boolean;       // Include completed tasks?
  max_outcomes?: number;             // Top N outcomes (default 3)
  max_must_do?: number;              // Max must-do items (default 5)
  include_waiting_on?: boolean;      // Show blockers? (default true)
  suggest_deferrals?: boolean;       // Suggest deferrals? (default true)
  show_overdue?: boolean;            // Show overdue? (default true)
  timezone?: string;                 // User's timezone
}
```

### Learning from Feedback

User feedback improves future briefings:

```typescript
interface BriefingFeedback {
  helpful: boolean;                  // Overall helpfulness
  accuracy_rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;                    // Free-form feedback
}
```

**Feedback Usage:**
- If "not helpful" consistently: lower threshold for suggestions
- High accuracy rating on top_outcomes: increase their weight
- User notes mentioning "too many tasks": reduce must_do count
- Pattern: If many tasks deferred, suggest fewer mandatory items

## Delivery Mechanisms

### 1. In-App Briefing

- Available at `/briefing` page
- Live generation with "Generate Now" button
- Historical view of past briefings
- Responsive design for mobile

### 2. Email Delivery

- Optional daily email at scheduled time
- HTML template with task links
- Unsubscribe option (configurable per workspace)
- Fallback to in-app if email delivery fails

### 3. Slack Integration (Future)

- Daily Slack message in workspace channel
- Task links clickable to open in app
- Quick reaction buttons: ✓ = done, ⏭️ = defer

### 4. Push Notifications

- Optional browser/mobile push at scheduled time
- Links to in-app briefing
- Configurable quiet hours

## Scheduling

### Cron Job Execution

```
# Generate briefings daily at user's preferred time
# Using user's timezone for proper scheduling

Every day at [user.briefing_preference.delivery_time]:
  For each active user in workspace:
    - Check if briefing for today exists
    - If not, generate new briefing
    - Store in database
    - Send notifications based on preferences
```

### On-Demand Generation

Users can generate briefings any time:
- Click "Generate Briefing" button
- Regenerates for current day
- Overwrites previous briefing
- Returns immediately (cached data)

## Feedback Loop

### Recording Feedback

```typescript
POST /api/briefing/:id/feedback
{
  helpful: boolean;
  accuracy_rating?: 1-5;
  notes?: string;
}
```

### Analyzing Feedback

Weekly aggregation:
- Average helpfulness score
- Most appreciated sections
- Common user feedback themes
- Quality metrics for system improvement

## Performance Considerations

### Caching

- Briefing content cached for 24 hours
- Task list snapshot taken at generation time
- Prevents stale data throughout the day

### Generation Time

- Target: < 2 seconds
- Depends on task count (typical: 10-100 tasks)
- Database queries optimized with indexes on:
  - `status, due_date`
  - `workspace_id, created_at`
  - `priority, assignee_id`

### Storage

- Each briefing: ~2-5 KB JSON
- Retention: 90 days
- Batch cleanup of old briefings

## Configuration

### BriefingPreference Interface

```typescript
interface BriefingPreference {
  id: string;
  workspace_id: string;
  user_id: string;
  delivery_time: string;          // HH:mm format (24h)
  timezone: string;               // e.g., "America/New_York"
  enabled: boolean;
  filters: BriefingFilters;
  created_at: ISO8601;
}
```

## API Endpoints

### GET /api/briefing
Get today's briefing (or generate if missing).

### POST /api/briefing/generate
Force regenerate today's briefing.

### GET /api/briefing/history
Get past briefings (paginated).

### GET /api/briefing/:id
Get specific briefing by ID.

### POST /api/briefing/:id/feedback
Record user feedback on briefing quality.

### GET /api/briefing/preferences
Get user's briefing preferences.

### PUT /api/briefing/preferences
Update briefing preferences.

## Quality Metrics

### Success Indicators

1. **User Engagement**: % clicking through tasks
2. **Completion Rate**: % of "Must Do" tasks completed
3. **Helpfulness**: Average feedback score (1-5)
4. **Accuracy**: % of suggested priorities correct
5. **Relevance**: Tasks in briefing vs tasks actually worked on

### Monitoring

- Track completion rates over time
- Monitor briefing generation failures
- Alert on feedback score dropping below 3.0
- Dashboard showing briefing effectiveness

## Best Practices

### For Product Teams

1. **Keep it Brief**: 3-5 top outcomes, max 10 items total
2. **Actionable**: Every item should be doable
3. **Respect Context**: Consider ongoing projects and dependencies
4. **Clear Rationale**: Tell user WHY something is suggested
5. **Editable**: Users should easily adjust their briefing

### For Users

1. Review briefing before starting day
2. Complete "Top 3 Outcomes" first
3. Use defer suggestions to manage workload
4. Give feedback to improve future briefings
5. Update task deadlines when plans change

## Future Enhancements

1. **AI-Powered Forecasting**: Predict task completion time
2. **Workload Balancing**: Suggest task redistribution
3. **Dependency Detection**: Alert on blocking dependencies
4. **Smart Scheduling**: Recommend optimal task order
5. **Habit Formation**: Track and improve user productivity patterns
6. **Team Briefings**: Aggregate team member tasks for managers
7. **Calendar Conflicts**: Alert on scheduled meetings conflicting with tasks
