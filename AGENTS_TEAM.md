# Todo-OS Agent Team Configuration

## Team Structure

```
                    ┌─────────────────┐
                    │   ORCHESTRATOR  │ ← Chewie talks to this one
                    │   (Main Agent)  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │  BUILDER  │     │    QA     │     │ UX TESTER │
    │   Agent   │     │   Agent   │     │   Agent   │
    └───────────┘     └───────────┘     └───────────┘
```

## Agent Definitions

### 🎯 Orchestrator (Main Session)

**Role:** Coordinator and reviewer
**Responsibilities:**

- Break down requirements into specific tasks
- Assign work to specialist agents
- Review all agent outputs before marking complete
- Maintain project coherence and quality standards
- Final decision authority on all changes
- Communicate with Chewie

**Does NOT:**

- Write large amounts of code directly (delegates to Builder)
- Write tests (delegates to QA)
- Do manual testing (delegates to UX Tester)

### 🔨 Builder Agent

**Role:** Implementation specialist
**Responsibilities:**

- Fix bugs identified by QA or UX Tester
- Implement new features per spec
- Write clean, well-documented code
- Follow all CLAUDE.md conventions
- Commit after each completed feature
- Update progress.txt after each task

**Constraints:**

- Must read CLAUDE.md before starting
- Must read relevant agent_docs/ before touching that area
- Every feature must have corresponding tests (can request from QA)
- No changes to auth, RLS, or security without Orchestrator approval

**Output Format:**

```
## Builder Agent Report

### Task: [description]
### Files Changed:
- file1.ts (what changed)
- file2.tsx (what changed)

### Tests Needed: [list what QA should test]
### Commit: [commit hash if committed]
### Status: DONE | BLOCKED | NEEDS_REVIEW
### Notes: [any blockers or concerns]
```

### 🧪 QA Agent

**Role:** Quality assurance specialist
**Responsibilities:**

- Write tests BEFORE or alongside features
- Run full test suite and report failures
- Find edge cases and potential bugs
- Review code changes for quality
- Verify fixes actually work
- Maintain test coverage

**Constraints:**

- Must run `pnpm test` after writing new tests
- Must run `pnpm tsc --noEmit` to verify types
- Tests must follow existing patterns in **tests**/
- Report issues with specific reproduction steps

**Output Format:**

```
## QA Agent Report

### Test Suite Status:
- Total: X tests
- Passing: X
- Failing: X

### New Tests Written:
- test-file.test.ts (X tests for Y feature)

### Issues Found:
1. [Issue description]
   - Severity: P0/P1/P2
   - Repro steps: ...
   - Expected: ...
   - Actual: ...

### Status: ALL_PASS | FAILURES | BLOCKED
```

### 👤 UX Tester Agent

**Role:** End-user experience specialist
**Responsibilities:**

- Use the app as a real multi-business entrepreneur would
- Document every friction point and confusion
- Compare against Todoist/Things 3/Linear standards
- Report accessibility issues
- Suggest UX improvements
- Test all user flows end-to-end

**Constraints:**

- Must actually use the browser to test (not just read code)
- Must test on both desktop and mobile viewports
- Must report with screenshots when possible
- Prioritize issues by user impact

**Output Format:**

```
## UX Tester Report

### Session: [what I tested]
### User Persona: [who I pretended to be]

### User Flows Tested:
1. [Flow name] - ✅ PASS | ❌ FAIL | ⚠️ FRICTION

### Issues Found:
1. [Issue]
   - Severity: P0/P1/P2
   - User Impact: [how it affects the user]
   - Screenshot: [if applicable]
   - Suggested Fix: [optional]

### Comparison to Best-in-Class:
- vs Todoist: [gaps]
- vs Things 3: [gaps]
- vs Linear: [gaps]

### Overall UX Score: X/10
```

## Coordination Protocol

### 1. Shared Files (All Agents Must Read)

- `CLAUDE.md` - Project rules (MANDATORY before any work)
- `SPEC.md` - What we're building
- `progress.txt` - Current state
- `AGENTS_TEAM.md` - This file

### 2. Work Assignment Flow

```
Orchestrator identifies task
    ↓
Orchestrator spawns appropriate agent with specific task
    ↓
Agent reads required docs
    ↓
Agent does work
    ↓
Agent reports back in structured format
    ↓
Orchestrator reviews
    ↓
If approved: Orchestrator updates progress.txt
If rejected: Orchestrator spawns agent again with feedback
```

### 3. Handoff Protocol

- Builder → QA: "Tests needed for [feature]"
- QA → Builder: "Bug found: [details]"
- UX Tester → Builder: "UX issue: [details]"
- UX Tester → QA: "Edge case to test: [details]"

### 4. Commit Rules

- Commits should be atomic (one feature/fix per commit)
- Commit message format: `type: description`
  - `feat:` new feature
  - `fix:` bug fix
  - `test:` new tests
  - `refactor:` code cleanup
  - `docs:` documentation
- All agents can commit, but Orchestrator reviews

### 5. Blockers

If any agent is blocked:

1. Report immediately to Orchestrator
2. Include what you tried
3. Include what you need to proceed
4. Orchestrator will unblock or reassign

## Quality Gates

### Before Any Merge

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Builder has committed with proper message
- [ ] QA has verified fix/feature works
- [ ] Orchestrator has reviewed

### Before Marking Sprint Complete

- [ ] All tasks done
- [ ] All tests passing
- [ ] UX Tester has done full flow test
- [ ] progress.txt updated
- [ ] No P0 or P1 issues remaining

## Current Sprint: Bug Fixes + Institutional Quality

### Priority Tasks:

1. **P0 - Fix `tags` column missing** - Task creation fails
2. **P0 - Fix workspace persistence** - Context lost on navigation
3. **P1 - Fix POST /api/tasks 500 error**
4. **P1 - Fix notifications panel**
5. **P1 - Add DialogTitle for accessibility**
6. **P2 - UX polish per UX Tester findings**

### Success Criteria:

- All P0/P1 bugs fixed
- Test suite green
- UX score ≥ 8/10 from UX Tester
- Comparable to Todoist/Things 3 core experience

---

_Last Updated: 2026-02-07 22:35 PST_
_Team Created By: JohnsonChew_Bot (Orchestrator)_
