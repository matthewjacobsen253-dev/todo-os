# Extract Test Command

Given a source file, extract and create comprehensive tests for it.

## Process:

1. Read the source file provided as argument
2. Identify all exported functions, classes, and components
3. For each export, create tests covering:
   - Happy path (expected usage)
   - Edge cases (empty inputs, nulls, boundaries)
   - Error cases (invalid inputs, failure modes)
4. Write tests using Vitest + @testing-library/react
5. Place test file adjacent to source as `__tests__/[filename].test.ts(x)`
6. Run the tests to verify they pass

## Test Conventions:
- Use `describe` blocks per function/component
- Use clear test names: `it("should do X when Y")`
- Mock Supabase client for database calls
- Mock external APIs (Anthropic, Resend, etc.)
- Test loading, error, and success states for async operations
