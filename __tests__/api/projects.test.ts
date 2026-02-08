import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
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

describe("Project API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/projects", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/projects/route");
      const request = new Request(
        "http://localhost/api/projects?workspace_id=ws-1",
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

      const { GET } = await import("@/app/api/projects/route");
      const request = new Request("http://localhost/api/projects");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });
  });

  describe("POST /api/projects", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/projects/route");
      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Test", workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when name is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/projects/route");
      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("name is required");
    });

    it("returns 400 when workspace_id is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/projects/route");
      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Test Project" }),
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
