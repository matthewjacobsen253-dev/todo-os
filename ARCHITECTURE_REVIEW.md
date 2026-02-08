# Architecture Review - Todo-OS

**Date:** 2026-02-07  
**Reviewed by:** Architect Agent  
**Codebase Version:** Sprint 3 (Bug Fixes In Progress)

---

## Executive Summary

Todo-OS demonstrates solid architectural foundations with clear separation of concerns, comprehensive TypeScript typing, and consistent patterns across the codebase. However, there are notable security patterns, performance opportunities, and technical debt items that should be addressed.

**Architecture Score: 7/10**

---

## Brain Docs Read

- [x] CLAUDE.md
- [x] SPEC.md  
- [x] AGENTS_TEAM.md
- [x] progress.txt
- [x] lessons.md
- [x] agent_docs/database_schema.md
- [x] agent_docs/briefing_system.md
- [x] agent_docs/email_extraction_pipeline.md

---

## Strengths Identified

### 1. Clean Folder Organization
```
app/          - Next.js App Router (pages, layouts, API routes)
components/   - React components (ui/, layout/, tasks/, projects/, settings/)
lib/          - Utilities organized by concern (supabase/, claude/, email/, gmail/, outlook/, inngest/)
hooks/        - Custom React hooks
store/        - Zustand state management
types/        - TypeScript type definitions
```
The structure follows Next.js 15 conventions perfectly.

### 2. Comprehensive Type System
- `types/index.ts` (460+ lines) covers all database entities, API types, and form inputs
- Proper use of union types for enums (`TaskStatus`, `TaskPriority`, etc.)
- Extended types for relationships (`TaskWithRelations`, `ProjectWithStats`)
- Input types separated from entity types (`CreateTaskInput`, `UpdateTaskInput`)

### 3. Well-Structured State Management
- Zustand store with 7 logical slices (Workspace, Task, Project, UI, Briefing, Notification, Review)
- Uses `immer` middleware for immutable updates
- Uses `useShallow` for performant selectors
- Clear separation between state and actions
- Custom hooks export clean APIs (`useTasks`, `useTaskActions`, etc.)

### 4. Consistent API Route Patterns
All API routes follow the same structure:
1. Auth check with `getUser()`
2. Parameter validation
3. Admin client for database operations
4. Consistent error response format: `{ error: string }` with appropriate status codes

### 5. Error Boundaries
- Dashboard error boundary implemented (`app/(dashboard)/error.tsx`)
- Briefing-specific error boundary (`app/(dashboard)/briefing/error.tsx`)

### 6. Database Design
- Proper multi-tenant architecture with `workspace_id` on all tables
- Junction table pattern for tags (`task_tags`)
- RLS policies defined in database schema
- Comprehensive indexing strategy documented

---

## Issues Found

### Issue 1: Admin Client Bypasses RLS Everywhere

**Severity:** HIGH  
**Location:** All 64 API route files using `createAdminClient()`  
**Problem:**  
Every API route uses `createAdminClient()` which uses the `SUPABASE_SERVICE_ROLE_KEY` and bypasses Row Level Security. While the routes manually check authentication, they don't verify workspace membership before querying data.

**Current Pattern:**
```typescript
const admin = createAdminClient();  // Bypasses RLS!
const { data } = await admin
  .from("tasks")
  .select("*")
  .eq("workspace_id", workspaceId);  // No membership check
```

**Risk:** A malicious user could access any workspace's data by guessing/enumerating workspace IDs.

**Recommendation:**
1. Add workspace membership verification to all routes:
```typescript
// Verify user has access to this workspace
const { data: membership } = await admin
  .from("workspace_members")
  .select("role")
  .eq("workspace_id", workspaceId)
  .eq("user_id", user.id)
  .single();

if (!membership) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```
2. Consider using server Supabase client with RLS for most operations
3. Reserve admin client only for background jobs (Inngest) where there's no user context

---

### Issue 2: N+1 Query Pattern in Projects API

**Severity:** MEDIUM  
**Location:** `app/api/projects/route.ts`  
**Problem:**  
The GET handler fetches all projects, then makes a separate query to get task counts:

```typescript
const { data } = await admin.from("projects").select("*")...;
const projectIds = data.map(p => p.id);
const { data: tasks } = await admin.from("tasks").select("project_id, status").in("project_id", projectIds);
// Then loops to count...
```

**Recommendation:**
Use a single query with aggregation or a Postgres function:
```sql
SELECT p.*, 
  COUNT(t.id) as task_count,
  COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
WHERE p.workspace_id = $1
GROUP BY p.id
```

---

### Issue 3: Missing Workspace Membership Verification

**Severity:** MEDIUM  
**Location:** Most API routes  
**Problem:**  
While some routes (like `review/[id]/approve`) correctly include `workspace_id` in their WHERE clause when querying specific entities, many routes trust the client-provided `workspace_id` without verifying the user belongs to that workspace.

**Good Example (in review/approve):**
```typescript
const { data: task } = await admin
  .from("tasks")
  .select("id, needs_review")
  .eq("id", id)
  .eq("workspace_id", workspace_id)  // ✓ Checks workspace
  .single();
```

**Missing in (tasks route):**
```typescript
// No verification user can access this workspace_id
const { data } = await admin
  .from("tasks")
  .select("*")
  .eq("workspace_id", workspaceId);  // Trusts client input
```

**Recommendation:**
Create a reusable middleware/helper:
```typescript
// lib/auth/workspace-guard.ts
export async function verifyWorkspaceAccess(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<{ role: string } | null> {
  const { data } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  return data;
}
```

---

### Issue 4: `any` Type in Template Component

**Severity:** LOW  
**Location:** `components/tutorial/fetch-data-steps.tsx:39`  
**Problem:**
```typescript
const [notes, setNotes] = useState<any[] | null>(null)
```

**Recommendation:**
```typescript
interface Note {
  id: number;
  title: string;
}
const [notes, setNotes] = useState<Note[] | null>(null)
```

---

### Issue 5: Notification System Stubbed

**Severity:** LOW  
**Location:** `store/index.ts` (NotificationState slice)  
**Problem:**  
The notification slice has no real backend implementation. `fetchNotifications` just sets empty arrays, and `markRead`/`markAllRead` are no-ops.

**Current:**
```typescript
fetchNotifications: async (_workspaceId: string, _userId: string) => {
  // Silently return empty for now
  set((state) => {
    state.notifications = [];
    state.unreadCount = 0;
  });
}
```

**Recommendation:**
Either:
1. Implement the notifications API route (`/api/notifications`)
2. Or remove the notification UI to avoid confusion

---

### Issue 6: Optimistic Updates Not Fully Implemented

**Severity:** LOW  
**Location:** `store/index.ts`, `hooks/useTasks.ts`  
**Problem:**  
The store's `updateTask` waits for the API response before updating state. The hooks try to wrap this with optimistic updates, but there's no rollback mechanism.

**Current in hook:**
```typescript
const updateTaskOptimistic = useCallback(async (taskId, updates) => {
  // No optimistic update here - just calls store.updateTask which waits for API
  await updateTask(currentWorkspace.id, taskId, updates);
}, []);
```

**Recommendation:**
Implement true optimistic updates with rollback:
```typescript
// In store:
updateTaskOptimistic: (taskId: string, updates: Partial<Task>) => {
  const previous = get().tasks.find(t => t.id === taskId);
  
  // Optimistically update
  set(state => {
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) state.tasks[idx] = { ...state.tasks[idx], ...updates };
  });
  
  return previous; // Return for rollback
},

rollbackTask: (taskId: string, previous: Task) => {
  set(state => {
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) state.tasks[idx] = previous;
  });
}
```

---

### Issue 7: Duplicate Logic Between Store and Hooks

**Severity:** LOW  
**Location:** `store/index.ts`, `hooks/useTasks.ts`  
**Problem:**  
`useTasks.ts` creates wrapper functions that duplicate store logic. The hooks should either:
- Purely compose store hooks, OR
- Add meaningful logic not in the store

**Example of duplication:**
```typescript
// In hooks/useTasks.ts
const changeTaskStatus = useCallback(
  async (taskId: string, status: TaskStatus) => {
    return updateTaskOptimistic(taskId, { status });
  },
  [updateTaskOptimistic]
);
```
This could be directly in the store as `changeTaskStatus`.

---

### Issue 8: Missing Accessibility (DialogTitle)

**Severity:** MEDIUM (P1 per AGENTS_TEAM.md)  
**Location:** Multiple dialog components  
**Problem:**  
Some dialogs may be missing `DialogTitle` which is required for screen readers.

**Files to check:**
- `components/tasks/quick-capture-dialog.tsx`
- `components/projects/project-create-dialog.tsx`
- `components/projects/project-edit-dialog.tsx`
- `components/layout/workspace-create-dialog.tsx`

---

### Issue 9: No Client-Side Rate Limiting

**Severity:** LOW  
**Location:** Store actions, form submissions  
**Problem:**  
Rapid clicks on buttons can fire duplicate API calls. There's no debouncing on mutation actions.

**Recommendation:**
Add a simple in-flight tracking mechanism:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);
  try {
    await createTask(...);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Quick Wins Fixed

### 1. Fixed `any` type in tutorial component

**File:** `components/tutorial/fetch-data-steps.tsx`  
**Change:** Added proper `Note` interface and typed the state.

**Commit:** (pending)

---

## Major Refactors Needed (TODOs)

### TODO 1: Implement Workspace Authorization Middleware
**Priority:** P0 (Security)  
**Effort:** 2-3 hours  
**Description:**  
Create a reusable authorization layer that verifies workspace membership before any workspace-scoped operation.

**Steps:**
1. Create `lib/auth/workspace-guard.ts`
2. Add `verifyWorkspaceAccess()` helper
3. Update all API routes to use this guard
4. Consider creating a higher-order function or middleware pattern

---

### TODO 2: Switch to RLS-First Architecture
**Priority:** P1 (Security)  
**Effort:** 4-6 hours  
**Description:**  
Reduce reliance on admin client. Use server client (with RLS) as default; reserve admin for background jobs.

**Steps:**
1. Audit which operations truly need admin client
2. Update RLS policies if needed to support server client
3. Refactor API routes to use `createClient()` instead of `createAdminClient()`
4. Keep admin client only for Inngest background functions

---

### TODO 3: Optimize N+1 Queries
**Priority:** P2 (Performance)  
**Effort:** 1-2 hours  
**Description:**  
Replace N+1 patterns with aggregated queries.

**Locations:**
- `app/api/projects/route.ts` - task counts
- Review other list endpoints for similar patterns

---

### TODO 4: Implement Real Notification System
**Priority:** P3 (Feature completeness)  
**Effort:** 4-6 hours  
**Description:**  
Either fully implement notifications or remove the UI.

**Steps:**
1. Create `/api/notifications` routes (GET, POST /mark-read)
2. Set up Supabase Realtime subscription for live updates
3. Add notification creation triggers in relevant operations

---

### TODO 5: Add True Optimistic Updates with Rollback
**Priority:** P3 (UX)  
**Effort:** 2-3 hours  
**Description:**  
Implement proper optimistic updates pattern in the store with rollback capability.

---

## Patterns to Standardize

### API Response Format
All routes should use:
```typescript
// Success
{ data: T }
// or for lists
{ data: T[], count?: number }

// Error
{ error: string }
```

### Error Handling
```typescript
try {
  // operation
} catch (err) {
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Internal server error" },
    { status: 500 }
  );
}
```

### Database Access Pattern
```typescript
const admin = createAdminClient();
// 1. Verify auth
// 2. Verify workspace access (TODO: implement)
// 3. Execute query
// 4. Return response
```

---

## Files Created

- `ARCHITECTURE_REVIEW.md` (this file)

---

## Summary Table

| Issue | Severity | Status | Effort |
|-------|----------|--------|--------|
| Admin client bypasses RLS | HIGH | TODO | 4-6h |
| Missing workspace verification | MEDIUM | TODO | 2-3h |
| N+1 query in projects | MEDIUM | TODO | 1-2h |
| Missing DialogTitle (a11y) | MEDIUM | TODO | 1h |
| `any` type in tutorial | LOW | FIXED | 5min |
| Notification system stubbed | LOW | TODO | 4-6h |
| Optimistic updates incomplete | LOW | TODO | 2-3h |
| Duplicate hook logic | LOW | TODO | 1h |
| No client-side rate limiting | LOW | TODO | 1h |

---

**Next Steps:**
1. Address HIGH severity security issues first (workspace authorization)
2. Fix MEDIUM accessibility issue (DialogTitle)
3. Address performance issues (N+1 queries)
4. Consider LOW priority items for future sprints
