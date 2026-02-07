import { useEffect, useCallback } from "react";
import { useReviewQueue, useReviewActions, useCurrentWorkspace } from "@/store";

/**
 * Hook for the review queue with auto-fetch on mount
 */
export const useReview = () => {
  const currentWorkspace = useCurrentWorkspace();
  const { reviewQueue, loading, error, count } = useReviewQueue();
  const { fetchReviewQueue, approveTask, rejectTask } = useReviewActions();

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchReviewQueue(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchReviewQueue]);

  const approve = useCallback(
    async (taskId: string, edits?: Record<string, unknown>) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }
      await approveTask(currentWorkspace.id, taskId, edits);
    },
    [currentWorkspace?.id, approveTask],
  );

  const reject = useCallback(
    async (taskId: string) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }
      await rejectTask(currentWorkspace.id, taskId);
    },
    [currentWorkspace?.id, rejectTask],
  );

  const refresh = useCallback(() => {
    if (currentWorkspace?.id) {
      fetchReviewQueue(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchReviewQueue]);

  return {
    reviewQueue,
    loading,
    error,
    count,
    approve,
    reject,
    refresh,
  };
};

export default useReview;
