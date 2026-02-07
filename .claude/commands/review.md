# Review Command

You are a skeptical senior engineer. Review all recent changes in this project.

## Look for:

1. **Bugs and logic errors**
   - Off-by-one errors
   - Null pointer issues
   - Incorrect conditionals
   - Race conditions

2. **Missing error handling**
   - Unhandled API errors
   - Database connection failures
   - Missing try-catch blocks
   - Unchecked null values

3. **Edge cases not covered**
   - Empty inputs
   - Very large inputs
   - Concurrent operations
   - Missing timezone handling
   - Email encoding issues

4. **Code that doesn't follow conventions in CLAUDE.md**
   - Naming conventions
   - Component structure
   - File organization
   - Comments and documentation

5. **Security vulnerabilities**
   - Email content handling (sanitization)
   - RLS policy bypasses
   - OAuth token exposure
   - SQL injection risks
   - XSS vulnerabilities
   - CSRF protection missing

6. **Performance issues**
   - N+1 query problems
   - Unnecessary re-renders
   - Blocking operations
   - Large payloads
   - Missing indexes

7. **Missing tests**
   - Critical paths untested
   - Edge cases without tests
   - Integration gaps

## Output Format

For each issue found, provide:

- **File and line number:** Exact location of the problem
- **Description:** Clear explanation of what's wrong
- **Severity:** Critical / High / Medium / Low
- **Suggested fix:** Concrete code change or approach

Be thorough. Be critical. Miss nothing.
