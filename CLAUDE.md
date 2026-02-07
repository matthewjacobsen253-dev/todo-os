# Project: Ultimate To-Do OS

## Tech Stack

- Next.js (App Router) with Supabase Starter Template
- TypeScript, Tailwind CSS, shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime)
- Zustand for client state management
- Inngest for background jobs (email scanning, briefing generation)
- Claude API for NLP task extraction and briefing generation
- Resend for transactional email
- Deployed on Vercel

## Commands

- Dev server: pnpm dev
- Run tests: pnpm test
- Type check: pnpm tsc --noEmit
- Lint: pnpm lint
- Build: pnpm build
- Format: pnpm format

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components (ui/, layout/, tasks/, etc.)
- `lib/` - Utilities, Supabase clients, store
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `supabase/migrations/` - SQL migration files

## Rules

- ALWAYS write tests for new features before marking them complete
- ALWAYS run tests before committing
- NEVER disable existing tests. Fix them.
- Use functional components with hooks. No class components.
- Handle all errors explicitly with descriptive messages
- Commit after each completed feature with descriptive messages
- All database queries must use Row Level Security (RLS)
- Multi-tenant: every query must scope to workspace_id
- Email content is untrusted input. Sanitize before display.
- Task extraction confidence scores required for all auto-created tasks
- Human-in-the-loop approval for medium/low confidence tasks
- Use `@/` path alias for all imports (maps to project root)
- Template uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY)

## Detailed Docs (read when relevant)

- agent_docs/database_schema.md
- agent_docs/email_extraction_pipeline.md
- agent_docs/briefing_system.md
