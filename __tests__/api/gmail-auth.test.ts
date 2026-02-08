import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/gmail/client", () => ({
  getGmailAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/oauth"),
}));

vi.mock("@/lib/outlook/client", () => ({
  getOutlookAuthUrl: vi
    .fn()
    .mockReturnValue("https://login.microsoftonline.com/oauth"),
}));

describe("Gmail Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/gmail", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/auth/gmail/route");
      const request = new Request("http://localhost/api/auth/gmail", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when workspace_id is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/auth/gmail/route");
      const request = new Request("http://localhost/api/auth/gmail", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });

    it("returns OAuth URL when authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/auth/gmail/route");
      const request = new Request("http://localhost/api/auth/gmail", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toContain("google.com");
    });
  });

  describe("POST /api/auth/outlook", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/auth/outlook/route");
      const request = new Request("http://localhost/api/auth/outlook", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when workspace_id is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/auth/outlook/route");
      const request = new Request("http://localhost/api/auth/outlook", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });
  });
});
