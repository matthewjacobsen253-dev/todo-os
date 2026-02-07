import { useEffect, useCallback } from "react";
import {
  useBriefing,
  useBriefingActions,
  useBriefingHistory,
  useBriefingPreferences,
  useCurrentWorkspace,
} from "@/store";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook for the briefing page with auto-fetch on mount.
 * Composes store hooks + workspace context (follows useReview pattern).
 */
export const useBriefingWithSync = () => {
  const currentWorkspace = useCurrentWorkspace();
  const { todayBriefing, loading, error, generating } = useBriefing();
  const { fetchBriefing, generateBriefing, submitFeedback } =
    useBriefingActions();
  const {
    history,
    loading: historyLoading,
    fetchHistory,
  } = useBriefingHistory();
  const {
    preferences,
    loading: preferencesLoading,
    fetchPreferences,
    updatePreferences,
  } = useBriefingPreferences();

  // Auto-fetch today's briefing on mount/workspace change
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id && currentWorkspace.id) {
        fetchBriefing(currentWorkspace.id, user.id);
      }
    });
  }, [currentWorkspace?.id, fetchBriefing]);

  const generate = useCallback(async () => {
    if (!currentWorkspace?.id) {
      throw new Error("No workspace selected");
    }
    return generateBriefing(currentWorkspace.id);
  }, [currentWorkspace?.id, generateBriefing]);

  const giveFeedback = useCallback(
    async (feedback: "thumbs_up" | "thumbs_down", notes?: string) => {
      if (!currentWorkspace?.id || !todayBriefing?.id) {
        throw new Error("No workspace or briefing selected");
      }
      await submitFeedback(
        todayBriefing.id,
        currentWorkspace.id,
        feedback,
        notes,
      );
    },
    [currentWorkspace?.id, todayBriefing?.id, submitFeedback],
  );

  const loadHistory = useCallback(() => {
    if (currentWorkspace?.id) {
      fetchHistory(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchHistory]);

  const loadPreferences = useCallback(() => {
    if (currentWorkspace?.id) {
      fetchPreferences(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchPreferences]);

  const savePreferences = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }
      await updatePreferences(currentWorkspace.id, updates);
    },
    [currentWorkspace?.id, updatePreferences],
  );

  return {
    briefing: todayBriefing,
    loading,
    error,
    generating,
    generate,
    giveFeedback,
    history,
    historyLoading,
    loadHistory,
    preferences,
    preferencesLoading,
    loadPreferences,
    savePreferences,
  };
};

export default useBriefingWithSync;
