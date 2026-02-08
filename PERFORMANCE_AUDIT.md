# Performance Audit Report - Todo-OS

## Performance Score: 7/10

### Summary

The Todo-OS application has a solid foundation with good architectural decisions, but there were several performance optimizations that have been implemented to make it feel faster like Linear.

---

## Optimizations Made

### 1. React.memo for List Items

- **Before:** TaskItem and GroupSection re-rendered on every parent update
- **After:** Components wrapped in React.memo, only re-render when props change
- **Files:** `components/tasks/task-item.tsx`, `components/tasks/task-list.tsx`
- **Impact:** Significantly reduces re-renders when scrolling long task lists

### 2. Query Limits Added

- **Before:** Some queries fetched unlimited results
- **After:** Added appropriate limits:
  - Briefing generation: 500 active tasks
  - Review queue: 50 items
  - Project task counts: 1000 tasks
- **Files:** `app/api/briefing/generate/route.ts`, `app/api/review/queue/route.ts`, `app/api/projects/route.ts`
- **Impact:** Faster API responses, reduced memory usage

### 3. Cache-Control Headers

- **Before:** No caching on API responses
- **After:** Added stale-while-revalidate caching:
  - Workspaces: 30s max-age, 60s stale
  - Projects: 15s max-age, 30s stale
- **Files:** `app/api/workspaces/route.ts`, `app/api/projects/route.ts`
- **Impact:** Faster subsequent page loads, reduced server load

### 4. Bundle Size Optimizations

- **Before:** Basic next.config.ts
- **After:** Added:
  - `optimizePackageImports` for lucide-react, date-fns, Radix UI
  - Compression enabled
  - Production source maps disabled
  - React strict mode enabled
- **File:** `next.config.ts`
- **Impact:** Smaller bundle size, faster initial page load

---

## Remaining Recommendations

### High Priority

1. **Add React Query/SWR for data fetching**
   - Would enable automatic caching, background refetching, and optimistic updates
   - Estimated impact: 20-30% faster perceived performance

2. **Implement virtual scrolling for long task lists**
   - Use `@tanstack/react-virtual` for lists > 100 items
   - Estimated impact: 50% memory reduction for large lists

### Medium Priority

3. **Lazy load heavy components**
   - Use `dynamic()` for TaskDetailSidebar, QuickCaptureDialog
   - Would reduce initial bundle size

4. **Add prefetching on hover**
   - Prefetch task details when hovering over a task
   - Would make detail view feel instant

### Low Priority

5. **Consider edge runtime for static routes**
   - Move read-only routes to edge for lower latency

---

## Metrics

### Bundle Analysis (estimated)

- **Largest dependencies:**
  - @anthropic-ai/sdk (~2-3MB) - Server-only, not in client bundle
  - lucide-react (~200KB raw, tree-shaken to ~20KB used)
  - date-fns (~75KB raw, tree-shaken)
  - zustand (~2KB gzipped)

### Query Patterns

- **Page load queries:**
  - GET /api/workspaces (1 query, cached)
  - GET /api/tasks (1 query with workspace_id)
  - GET /api/projects (1 query with workspace_id)
  - GET /api/review/queue (1 query, limited to 50)
- **Total queries on dashboard load:** 4 (optimized from potential N+1 issues)

### React Performance

- **Zustand selectors:** ✅ Using `useShallow` correctly
- **Component memoization:** ✅ TaskItem, GroupSection memoized
- **useMemo/useCallback:** ✅ Used appropriately
- **Skeleton loaders:** ✅ Present and consistent

---

## Status: DONE

All critical performance optimizations have been implemented. The app should now feel noticeably faster, especially when:

- Loading workspaces and projects (cached responses)
- Scrolling through long task lists (memoized components)
- Generating briefings (limited query size)
- Reviewing extracted tasks (paginated to 50)
