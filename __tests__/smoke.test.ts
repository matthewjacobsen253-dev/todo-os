import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  slugify,
  truncate,
  isValidEmail,
  getPriorityColor,
  getStatusColor,
} from "@/lib/utils";

describe("Smoke Test", () => {
  it("cn utility merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("formatDate formats a valid date", () => {
    const result = formatDate("2026-02-07T00:00:00Z");
    expect(result).toContain("Feb");
    expect(result).toContain("2026");
  });

  it("slugify converts strings to URL-safe slugs", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("My Business Name!")).toBe("my-business-name");
    expect(slugify("  spaces  ")).toBe("spaces");
  });

  it("truncate shortens strings correctly", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("this is a long string", 10)).toBe("this is a ...");
  });

  it("isValidEmail validates email formats", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("getPriorityColor returns colors for each priority", () => {
    expect(getPriorityColor("urgent")).toContain("red");
    expect(getPriorityColor("high")).toContain("orange");
    expect(getPriorityColor("medium")).toContain("yellow");
    expect(getPriorityColor("low")).toContain("blue");
    expect(getPriorityColor("none")).toContain("gray");
  });

  it("getStatusColor returns colors for each status", () => {
    expect(getStatusColor("inbox")).toContain("gray");
    expect(getStatusColor("todo")).toContain("blue");
    expect(getStatusColor("in_progress")).toContain("purple");
    expect(getStatusColor("done")).toContain("green");
  });
});
