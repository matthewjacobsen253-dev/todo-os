import { describe, it, expect } from "vitest";
import {
  sanitizeEmailContent,
  sanitizeEmailSubject,
} from "@/lib/email/sanitize";

describe("sanitizeEmailContent", () => {
  it("strips HTML tags", () => {
    const result = sanitizeEmailContent("<p>Hello <b>World</b></p>");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<b>");
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });

  it("removes script and style tags with content", () => {
    const result = sanitizeEmailContent(
      '<div>Hi</div><script>alert("xss")</script><style>.x{color:red}</style>',
    );
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
    expect(result).not.toContain("style");
    expect(result).toContain("Hi");
  });

  it("escapes special characters", () => {
    // Note: HTML tags are stripped first, then special chars are escaped
    // So <world> gets stripped as a tag; use plain text with & and quotes
    const result = sanitizeEmailContent("Hello & \"friends\" & 'others'");
    expect(result).toContain("&amp;");
    expect(result).toContain("&quot;");
    expect(result).toContain("&#x27;");
  });

  it("truncates content exceeding max length", () => {
    const longContent = "a".repeat(60000);
    const result = sanitizeEmailContent(longContent);
    expect(result.length).toBeLessThanOrEqual(50003 + 10); // max + "..." + some entity expansion
  });

  it("returns empty string for null input", () => {
    expect(sanitizeEmailContent(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(sanitizeEmailContent(undefined)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(sanitizeEmailContent("")).toBe("");
  });
});

describe("sanitizeEmailSubject", () => {
  it("returns sanitized subject", () => {
    // HTML tags are stripped first, so <tomorrow> is removed as a tag
    const result = sanitizeEmailSubject("Re: Meeting & Agenda");
    expect(result).toContain("Re: Meeting");
    expect(result).toContain("&amp;");
    expect(result).toContain("Agenda");
  });

  it('returns "(No subject)" for null input', () => {
    expect(sanitizeEmailSubject(null)).toBe("(No subject)");
  });

  it('returns "(No subject)" for undefined input', () => {
    expect(sanitizeEmailSubject(undefined)).toBe("(No subject)");
  });
});
