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

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Email Scan API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/email-scan/status", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/email-scan/status/route");
      const request = new Request(
        "http://localhost/api/email-scan/status?workspace_id=ws-1",
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

      const { GET } = await import("@/app/api/email-scan/status/route");
      const request = new Request("http://localhost/api/email-scan/status");
      const response = await GET(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspace_id is required");
    });
  });

  describe("PATCH /api/email-scan/config", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { PATCH } = await import("@/app/api/email-scan/config/route");
      const request = new Request("http://localhost/api/email-scan/config", {
        method: "PATCH",
        body: JSON.stringify({ workspace_id: "ws-1", enabled: true }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PATCH(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid confidence_threshold", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { PATCH } = await import("@/app/api/email-scan/config/route");
      const request = new Request("http://localhost/api/email-scan/config", {
        method: "PATCH",
        body: JSON.stringify({
          workspace_id: "ws-1",
          confidence_threshold: 1.5,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PATCH(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("confidence_threshold");
    });
  });

  describe("POST /api/email-scan/start", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/email-scan/start/route");
      const request = new Request("http://localhost/api/email-scan/start", {
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

    it("returns 400 when no config exists", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      // Mock: from().select().eq().eq().maybeSingle()
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { POST } = await import("@/app/api/email-scan/start/route");
      const request = new Request("http://localhost/api/email-scan/start", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "ws-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(
        request as unknown as import("next/server").NextRequest,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Connect your email first");
    });
  });
});
