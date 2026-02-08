import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
  rpc: mockRpc,
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

describe("Workspaces API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/workspaces", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { GET } = await import("@/app/api/workspaces/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("returns empty array when user has no workspace memberships", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      // Mock workspace_members query returning empty
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq });
      mockSelect.mockReturnValue({ eq: mockEq });

      const { GET } = await import("@/app/api/workspaces/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });

    it("returns workspaces with roles for authenticated user", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const mockMemberData = [
        { workspace_id: "ws-1", role: "owner" },
        { workspace_id: "ws-2", role: "member" },
      ];

      const mockWorkspaces = [
        {
          id: "ws-1",
          name: "My Workspace",
          slug: "my-workspace",
          owner_id: "user-1",
        },
        {
          id: "ws-2",
          name: "Team Workspace",
          slug: "team-workspace",
          owner_id: "user-2",
        },
      ];

      // Mock workspace_members query
      const mockMemberSelect = vi.fn().mockReturnThis();
      const mockMemberEq = vi
        .fn()
        .mockResolvedValue({ data: mockMemberData, error: null });
      mockMemberSelect.mockReturnValue({ eq: mockMemberEq });

      // Mock workspaces query
      const mockWsSelect = vi.fn().mockReturnThis();
      const mockWsIn = vi
        .fn()
        .mockResolvedValue({ data: mockWorkspaces, error: null });
      mockWsSelect.mockReturnValue({ in: mockWsIn });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "workspace_members" || callCount === 1) {
          return { select: mockMemberSelect };
        }
        return { select: mockWsSelect };
      });

      const { GET } = await import("@/app/api/workspaces/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].role).toBe("owner");
      expect(data.data[1].role).toBe("member");
    });
  });

  describe("POST /api/workspaces", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { POST } = await import("@/app/api/workspaces/route");
      const request = new Request("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Test Workspace", slug: "test-ws" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("returns 400 when name is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/workspaces/route");
      const request = new Request("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ slug: "test-ws" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and slug are required");
    });

    it("returns 400 when slug is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const { POST } = await import("@/app/api/workspaces/route");
      const request = new Request("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Test Workspace" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and slug are required");
    });

    it("creates workspace and adds owner as member", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const mockWorkspace = {
        id: "ws-new",
        name: "New Workspace",
        slug: "new-ws",
        owner_id: "user-1",
      };

      // Mock workspace insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: mockWorkspace, error: null });

      // Mock member insert
      const mockMemberInsert = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "workspaces" || callCount === 1) {
          return {
            insert: mockInsert,
            select: mockSelect,
          };
        }
        return { insert: mockMemberInsert };
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const { POST } = await import("@/app/api/workspaces/route");
      const request = new Request("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "New Workspace", slug: "new-ws" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("ws-new");
      expect(data.name).toBe("New Workspace");
      expect(data.owner_id).toBe("user-1");
    });
  });
});
