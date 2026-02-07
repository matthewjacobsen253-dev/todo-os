# Plan Command

Enter planning mode for a new feature. Follow this process:

## 1. Read Project Context

Read these files to understand the full product context:

- `SPEC.md` - Complete product specification and requirements
- `CLAUDE.md` - Project conventions and guidelines
- `progress.txt` - Current development state and completed work

## 2. Examine Related Code

Based on the feature being planned, examine:

- Existing components in `components/`
- Database schema in `supabase/migrations/`
- API routes in `app/api/`
- Related types in `types/`

Look for:

- Similar implementations you can build on
- Patterns and conventions used in the codebase
- Potential code reuse opportunities
- Dependencies and limitations

## 3. Propose Implementation Plan

Create a detailed implementation plan that includes:

**Overview**

- One-sentence summary of what's being built
- Why this feature matters

**Scope Definition**

- What's IN scope for this feature
- What's OUT of scope (defer to future)
- Dependencies on other features

**Technical Approach**

- Database changes needed (new tables, migrations)
- New API endpoints or modifications
- Frontend components needed
- External service integrations
- Background jobs needed

**Step-by-Step Implementation**

- Break into 5-8 concrete steps
- Each step should be 1-2 hours of work
- Include testing for each step
- Include integration points

**Edge Cases to Handle**

- List 5+ edge cases specific to this feature
- How will each be handled

**Testing Strategy**

- Unit tests
- Integration tests
- Manual testing checklist
- Metrics to validate feature works

**Potential Risks**

- Performance implications
- Security concerns
- Complexity risks
- External service dependencies

## 4. List Clarifying Questions

Ask any questions needed to proceed:

- Unclear requirements?
- Ambiguous user flows?
- Technical decisions needed?
- Design direction questions?

## 5. Wait for Approval

Present the plan to the user and wait for approval or feedback before:

- Writing any code
- Creating new files
- Modifying database schema
- Making breaking changes

Once approved, proceed with implementation step by step, testing as you go.
