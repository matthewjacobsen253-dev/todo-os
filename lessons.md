# Learning Journal - Ultimate To-Do OS

## Template for Lessons Learned
When documenting a lesson, use this structure:

```
### Date: YYYY-MM-DD | Feature/Area: [Feature Name]
**Challenge:** [What problem did you encounter?]
**Solution:** [How did you solve it?]
**Key Takeaway:** [What will you remember next time?]
**References:** [Links to relevant docs, issues, PRs, etc.]
```

## Lessons

### Date: 2026-02-07 | Feature/Area: Project Scaffolding
**Challenge:** Initial project was created with `create-next-app` from scratch instead of using the official Supabase + Next.js starter template. This violated the build instructions' "START FROM A TEMPLATE" rule and missed built-in auth flows, middleware patterns, and Supabase client setup.
**Solution:** Deleted the project and re-created using `npx create-next-app --example with-supabase`. Then ported validated code from the previous attempt.
**Key Takeaway:** ALWAYS start from the official template. It provides production-ready auth, middleware, Supabase client config, and shadcn/ui setup. Building from scratch wastes time and introduces subtle bugs.
**References:** Supabase Next.js starter: https://github.com/vercel/next.js/tree/canary/examples/with-supabase

### Date: 2026-02-07 | Feature/Area: Template Conventions
**Challenge:** The Supabase starter template uses different conventions than expected - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of `ANON_KEY`, `proxy.ts` instead of `middleware.ts`, no `src/` directory, Tailwind v3 with config file.
**Solution:** Adapted all ported code to match template conventions. Used `@/*` -> `./*` path aliases.
**Key Takeaway:** Read the template thoroughly before porting code. Adapt to the template's patterns, don't force your own.

---

## Index by Category
- **Architecture:** Template selection (2026-02-07)
- **Performance:** [Add entries as you learn]
- **Security:** [Add entries as you learn]
- **Testing:** [Add entries as you learn]
- **Database:** [Add entries as you learn]
- **API Integration:** [Add entries as you learn]
- **DevOps/Deployment:** [Add entries as you learn]
- **Code Organization:** Template conventions (2026-02-07)
