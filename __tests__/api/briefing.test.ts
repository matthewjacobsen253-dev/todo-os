import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
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

vi.mock("@/lib/claude/briefing-generator", () => ({
  generateBriefing: vi.fn().mockResolvedValue({
    top_outcomes: [],
    must_do: [],
    defer_suggestions: [],
    waiting_on: [],
    overdue: [],
    summary: { total_tasks: 0, urgent_count: 0, completed_today: 0 },
  }),
}));

// Mock workspace access - allow by default
vi.mock("@/lib/auth/workspace-guard", () => ({
  checkWorkspaceAccess: vi.fn().mockResolvedValue({
    allowed: true,
    access: { role: "member" },
  }),
  verifyWorkspaceAccess: vi.fn().mockResolvedValue({ role: "member" }),
  requireWorkspaceAccess: vi.fn().mockResolvedValue({ role: "member" }),
}));

describe("Briefing API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/briefing", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/briefing/route");
      const request = new Request(
        "http://localhost/api/briefing?workspace_id=ws-1",
      );
      const response = await GET(
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

      const { GET } = await import("@/app/api/briefing/route");
      const request = new Request("http://localhost/api/briefing");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });

    it("returns data when briefing exists", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const mockBriefing = {
        id: "b-1",
        workspace_id: "ws-1",
        user_id: "user-1",
        date: "2026-02-07",
        content: { top_outcomes: [] },
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockBriefing,
        error: null,
      });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { GET } = await import("@/app/api/briefing/route");
      const request = new Request(
        "http://localhost/api/briefing?workspace_id=ws-1",
      );
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockBriefing);
    });
  });

  describe("POST /api/briefing/generate", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/briefing/generate/route");
      const request = new Request("http://localhost/api/briefing/generate", {
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

      const { POST } = await import("@/app/api/briefing/generate/route");
      const request = new Request("http://localhost/api/briefing/generate", {
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

  describe("POST /api/briefing/[id]/feedback", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/briefing/[id]/feedback/route");
      const request = new Request(
        "http://localhost/api/briefing/b-1/feedback",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: "ws-1",
            feedback: "thumbs_up",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "b-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid feedback value", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/briefing/[id]/feedback/route");
      const request = new Request(
        "http://localhost/api/briefing/b-1/feedback",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: "ws-1",
            feedback: "invalid",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "b-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("feedback must be 'thumbs_up' or 'thumbs_down'");
    });

    it("returns 400 when workspace_id is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/briefing/[id]/feedback/route");
      const request = new Request(
        "http://localhost/api/briefing/b-1/feedback",
        {
          method: "POST",
          body: JSON.stringify({ feedback: "thumbs_up" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "b-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });
  });

  describe("GET /api/briefing/preferences", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/briefing/preferences/route");
      const request = new Request(
        "http://localhost/api/briefing/preferences?workspace_id=ws-1",
      );
      const response = await GET(
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

      const { GET } = await import("@/app/api/briefing/preferences/route");
      const request = new Request("http://localhost/api/briefing/preferences");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });

    it("returns defaults when no preferences exist", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { GET } = await import("@/app/api/briefing/preferences/route");
      const request = new Request(
        "http://localhost/api/briefing/preferences?workspace_id=ws-1",
      );
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.delivery_time).toBe("08:00");
      expect(data.data.timezone).toBe("America/New_York");
      expect(data.data.enabled).toBe(false);
    });
  });

  describe("PUT /api/briefing/preferences", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { PUT } = await import("@/app/api/briefing/preferences/route");
      const request = new Request("http://localhost/api/briefing/preferences", {
        method: "PUT",
        body: JSON.stringify({
          workspace_id: "ws-1",
          delivery_time: "09:00",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(
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

      const { PUT } = await import("@/app/api/briefing/preferences/route");
      const request = new Request("http://localhost/api/briefing/preferences", {
        method: "PUT",
        body: JSON.stringify({ delivery_time: "09:00" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });
  });

  describe("GET /api/briefing/history", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/briefing/history/route");
      const request = new Request(
        "http://localhost/api/briefing/history?workspace_id=ws-1",
      );
      const response = await GET(
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

      const { GET } = await import("@/app/api/briefing/history/route");
      const request = new Request("http://localhost/api/briefing/history");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });
  });

  describe("GET /api/briefing/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/briefing/[id]/route");
      const request = new Request("http://localhost/api/briefing/b-1");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "b-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 for nonexistent briefing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { GET } = await import("@/app/api/briefing/[id]/route");
      const request = new Request("http://localhost/api/briefing/nonexistent");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "nonexistent" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Briefing not found");
    });
  });

  describe("Error handling (try-catch)", () => {
    it("GET /api/briefing returns 500 when createClient throws", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      vi.mocked(createClient).mockRejectedValueOnce(new Error("DB down"));

      const { GET } = await import("@/app/api/briefing/route");
      const request = new Request(
        "http://localhost/api/briefing?workspace_id=ws-1",
      );
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("DB down");
    });

    it("POST /api/briefing/generate returns 500 when createClient throws", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      vi.mocked(createClient).mockRejectedValueOnce(
        new Error("Connection failed"),
      );

      const { POST } = await import("@/app/api/briefing/generate/route");
      const request = new Request("http://localhost/api/briefing/generate", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Connection failed");
    });

    it("GET /api/briefing/history returns 500 when createClient throws", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      vi.mocked(createClient).mockRejectedValueOnce(new Error("Timeout"));

      const { GET } = await import("@/app/api/briefing/history/route");
      const request = new Request(
        "http://localhost/api/briefing/history?workspace_id=ws-1",
      );
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Timeout");
    });

    it("GET /api/briefing/[id] returns 500 when createClient throws", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      vi.mocked(createClient).mockRejectedValueOnce(new Error("Network error"));

      const { GET } = await import("@/app/api/briefing/[id]/route");
      const request = new Request("http://localhost/api/briefing/b-1");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "b-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Network error");
    });

    it("POST /api/briefing/[id]/feedback returns 500 when createClient throws", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      vi.mocked(createClient).mockRejectedValueOnce(new Error("Auth failed"));

      const { POST } = await import("@/app/api/briefing/[id]/feedback/route");
      const request = new Request(
        "http://localhost/api/briefing/b-1/feedback",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: "ws-1",
            feedback: "thumbs_up",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "b-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Auth failed");
    });

    it("GET /api/briefing/preferences returns 500 when createClient throws", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      vi.mocked(createClient).mockRejectedValueOnce(
        new Error("Service unavailable"),
      );

      const { GET } = await import("@/app/api/briefing/preferences/route");
      const request = new Request(
        "http://localhost/api/briefing/preferences?workspace_id=ws-1",
      );
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Service unavailable");
    });
  });
});
