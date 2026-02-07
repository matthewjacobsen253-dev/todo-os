import { describe, it, expect, vi, beforeEach } from "vitest";
import { useStore } from "@/store";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Briefing Store Error States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useStore.setState({
      briefingHistoryLoading: false,
      briefingHistoryError: null,
      briefingHistory: [],
      briefingPreferencesLoading: false,
      briefingPreferencesError: null,
      briefingPreferences: null,
    });
  });

  it("fetchBriefingHistory sets error state on failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await useStore.getState().fetchBriefingHistory("ws-1");

    const state = useStore.getState();
    expect(state.briefingHistoryLoading).toBe(false);
    expect(state.briefingHistoryError).toBe("Network error");
  });

  it("fetchBriefingPreferences sets error state on failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    await useStore.getState().fetchBriefingPreferences("ws-1");

    const state = useStore.getState();
    expect(state.briefingPreferencesLoading).toBe(false);
    expect(state.briefingPreferencesError).toBe("Connection refused");
  });
});
