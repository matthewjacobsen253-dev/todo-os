# Email Extraction Pipeline Documentation

## Overview

The email extraction pipeline automatically scans email accounts (Gmail, Outlook) and intelligently extracts actionable tasks. The system uses AI-powered analysis to identify task requests, determine priority levels, and assess confidence scores for human review.

## Architecture

```
Email Account
    ↓
OAuth Authentication
    ↓
Email Fetch & Parse
    ↓
Content Analysis
    ↓
Task Extraction
    ↓
Confidence Scoring
    ↓
Deduplication Check
    ↓
Human Review Queue
    ↓
Task Creation (on Approval)
```

## Ingestion Flow

### 1. OAuth Authentication

Each user connects their email account through OAuth 2.0 flow:
- **Gmail**: Uses Google OAuth with `https://www.googleapis.com/auth/gmail.readonly` scope
- **Outlook**: Uses Microsoft OAuth with `Mail.Read` scope

Credentials are stored securely in Supabase with encrypted access tokens.

### 2. Email Fetching

Periodic scans (configurable interval, default 2 hours) fetch new emails:
- Only unread emails are processed to avoid duplicates
- Respects quiet hours (e.g., 6 PM - 8 AM)
- Skips weekends if disabled in configuration
- Subject and body are extracted and normalized

### 3. Content Parsing

Email parsing extracts:
- **From**: Sender name and email address
- **To**: Recipient email
- **Subject**: Email subject line
- **Body**: Full message text (sanitized)
- **Timestamp**: Email received date
- **Attachments**: Metadata (filename, size, type)

HTML emails are converted to plain text. Signatures and quoted text are preserved for context.

### 4. Task Extraction

The extraction engine applies rules and patterns:

#### Extraction Patterns

**Direct Requests:**
- "Can you..." / "Could you..."
- "Please..." / "I need you to..."
- "Action required:" / "Action item:"
- "TODO:" / "FIXME:"

**Implicit Requests:**
- Deadline mentions: "by Friday", "by EOD", "before Q1"
- Assignment statements: "You should...", "Someone needs to..."
- Questions requiring action: "Can we schedule...?"

**Delegations:**
- "@mention" + action: "Can @sarah review this?"
- "Assign to X"

#### Extraction Rules

1. **Minimum Length**: Task title must be at least 10 characters
2. **Relevance**: Extract only work-related tasks (filtered by keywords)
3. **Uniqueness**: Check against existing tasks (exact match detection)
4. **Completeness**: Title + context are required

### 5. Confidence Scoring

The confidence score (0-1 scale) reflects extraction quality:

#### Scoring Factors

**High Confidence (0.8+):**
- Contains direct action verbs ("submit", "approve", "review")
- Explicit deadline mentioned
- Sender is a known contact or manager
- Subject line contains "Action required"
- Clear responsibility assignment

**Medium Confidence (0.6-0.79):**
- Contains imperative sentence
- Moderate urgency language
- Related to known projects
- Discussion of tasks with implied action

**Low Confidence (<0.6):**
- Passive language ("it would be good if...")
- Vague instructions ("let me know about...")
- Conversational context (not clearly actionable)
- No deadline or priority indication

#### Scoring Algorithm

```
score = 0.0

// Action verb presence (+0.25)
if contains_action_verb():
    score += 0.25

// Deadline presence (+0.2)
if contains_deadline():
    score += 0.2

// Sender authority (+0.15)
if sender_is_manager_or_vip():
    score += 0.15

// Explicitness (+0.2)
if is_direct_request():
    score += 0.2

// Assignment clarity (+0.2)
if clear_assignment():
    score += 0.2

// Normalize
score = min(score, 1.0)
```

### 6. Priority Assignment

Priority is determined by:

**Urgent:**
- Email subject contains "urgent" or "ASAP"
- Sender is executive/manager
- Deadline is today or tomorrow
- Contains escalation language

**High:**
- Deadline within 1 week
- Sender is direct manager or key stakeholder
- Contains "action required"
- Related to critical projects

**Medium:**
- Deadline within 2 weeks
- Normal team communication
- Non-critical project work

**Low:**
- General information or FYI
- Deadline beyond 2 weeks
- Routine/recurring tasks

### 7. Deduplication Strategy

Before creating a task, the system checks for duplicates:

1. **Exact Match**: Title and sender match → Skip
2. **Semantic Match**: Similar content from same sender within 24 hours → Flag as potential duplicate
3. **Task ID Matching**: Check if source email already has a linked task → Skip
4. **Confidence Threshold**: Tasks below configured threshold are auto-rejected (optional)

## Human-in-the-Loop Review

All extracted tasks enter the review queue unless:
- Confidence score >= 0.95 AND sender is trusted
- Task matches a known recurring pattern

### Review States

1. **Pending Review**: Awaiting user decision
2. **Approved**: Task created in system
3. **Rejected**: Marked as non-actionable
4. **Edit & Approve**: User modified details before creating

## Rate Limiting & Error Handling

### API Rate Limits

- **Gmail**: 100 emails/scan (Gmail API limits to 1M/day)
- **Outlook**: 100 emails/scan (default pagination)
- **Scan Frequency**: Configurable 1-24 hour intervals

### Error Handling

**Transient Errors** (retry up to 3 times with exponential backoff):
- Network timeouts
- Rate limit exceeded
- Temporary service unavailability

**Permanent Errors** (log and skip):
- Invalid OAuth token → Require re-authentication
- Email marked as spam → Skip permanently
- Unreadable email format → Log with metadata
- Large email size (>25MB) → Skip with notification

## Audit Logging

Every extraction action is logged:

```typescript
{
  workspace_id: string;
  action: 'scan_started' | 'email_fetched' | 'task_extracted' | 'task_approved' | 'task_rejected';
  email_id: string;
  task_id?: string;
  confidence_score?: number;
  sender: string;
  timestamp: ISO8601;
  error?: string;
  metadata: Record<string, unknown>;
}
```

Logs are retained for 90 days and used for:
- Debugging extraction failures
- Improving confidence scoring
- Compliance and audit trails

## Security Considerations

### Email Content is Untrusted

- Email bodies may contain malicious links or scripts
- Never execute email content directly
- Sanitize all email text before display
- URL preview feature should be server-side safe

### Privacy Protection

- Email content snippets are truncated for display
- Full email text not cached unnecessarily
- Sender info (only name + domain) stored in task
- Email content marked as "private" in audit logs

### OAuth Token Security

- Tokens encrypted in Supabase with `aes-256-gcm`
- Tokens never logged or exposed in errors
- Automatic token rotation (30-day expiry)
- Token refresh happens transparently

## Configuration

### EmailScanConfig Interface

```typescript
interface EmailScanConfig {
  id: string;
  workspace_id: string;
  user_id: string;
  provider: 'gmail' | 'outlook';
  enabled: boolean;
  scan_interval_hours: number;        // 1-24
  quiet_hours_start?: string;         // HH:mm format
  quiet_hours_end?: string;           // HH:mm format
  weekend_scan: boolean;
  confidence_threshold: number;       // 0-1, auto-reject below
  last_scan_at?: ISO8601;
  created_at: ISO8601;
}
```

## API Endpoints

### GET /api/email-scan/status
Returns current scan configuration and history.

### POST /api/email-scan/start
Manually trigger a scan for the current user.

### GET /api/review/queue
Get pending extracted tasks for review.

### POST /api/review/:taskId/approve
Approve an extracted task and create it.

### POST /api/review/:taskId/reject
Reject an extracted task.

## Future Enhancements

1. **Smart Grouping**: Group related emails as single task
2. **Attachment Handling**: Automatically attach emails to tasks
3. **Recurring Task Detection**: Identify recurring task patterns
4. **Calendar Integration**: Extract tasks from calendar invites
5. **Natural Language Dates**: Parse "next Friday" → actual date
6. **Multi-language Support**: Extract tasks in non-English emails
7. **ML Model Improvement**: Train custom confidence model per workspace
