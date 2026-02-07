# Commit Command

Perform a clean commit following this process:

## 1. Run Tests
```bash
pnpm test
```
Fix any test failures before proceeding.

## 2. Format Code
```bash
pnpm format
```
Ensure all code is formatted consistently.

## 3. Type Check
```bash
pnpm tsc --noEmit
```
Fix any TypeScript errors.

## 4. Create Commit

Use a descriptive conventional commit message with the format:
```
type(scope): description
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring without feature change
- `test` - Test additions or updates
- `docs` - Documentation changes
- `chore` - Build, dependencies, or tooling changes
- `perf` - Performance improvements
- `style` - Code style changes (formatting, semicolons, etc.)

**Scope examples:**
- `api` - Backend API changes
- `ui` - Frontend component changes
- `email` - Email extraction and scanning
- `briefing` - Daily briefing system
- `db` - Database schema or migrations
- `auth` - Authentication changes

**Examples:**
- `feat(email): add Gmail OAuth connection`
- `fix(api): prevent duplicate task extraction`
- `refactor(ui): extract TaskList to separate component`
- `test(email): add extraction confidence scoring tests`

## 5. Verify

After commit, run:
```bash
git status
```

Should show no uncommitted changes. If there are additional changes, commit them separately with appropriate messages.
