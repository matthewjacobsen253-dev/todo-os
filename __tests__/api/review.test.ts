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

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

describe("Review API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/review/queue", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/review/queue/route");
      const request = new Request(
        "http://localhost/api/review/queue?workspace_id=ws-1",
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

      const { GET } = await import("@/app/api/review/queue/route");
      const request = new Request("http://localhost/api/review/queue");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });
  });

  describe("POST /api/review/[id]/approve", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/review/[id]/approve/route");
      const request = new Request(
        "http://localhost/api/review/task-1/approve",
        {
          method: "POST",
          body: JSON.stringify({ workspace_id: "ws-1" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "task-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 for nonexistent task", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      // Mock chained query returning no task
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { POST } = await import("@/app/api/review/[id]/approve/route");
      const request = new Request(
        "http://localhost/api/review/nonexistent/approve",
        {
          method: "POST",
          body: JSON.stringify({ workspace_id: "ws-1" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "nonexistent" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });
  });

  describe("POST /api/review/[id]/reject", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/review/[id]/reject/route");
      const request = new Request("http://localhost/api/review/task-1/reject", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "task-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 for nonexistent task", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { POST } = await import("@/app/api/review/[id]/reject/route");
      const request = new Request(
        "http://localhost/api/review/nonexistent/reject",
        {
          method: "POST",
          body: JSON.stringify({ workspace_id: "ws-1" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
        { params: Promise.resolve({ id: "nonexistent" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });
  });
});
