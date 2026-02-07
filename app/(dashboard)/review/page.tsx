"use client";

import { useReview } from "@/hooks/useReview";
import { ReviewTaskCard } from "@/components/review/review-task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck } from "lucide-react";

export default function ReviewPage() {
  const { reviewQueue, loading, error, count, approve, reject } = useReview();

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Review Queue</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Review Queue</h1>
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {count > 0
              ? `${count} task${count !== 1 ? "s" : ""} extracted from email awaiting review`
              : "All clear! No tasks to review."}
          </p>
        </div>
      </div>

      {reviewQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold text-muted-foreground">
            No tasks to review
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            When emails are scanned and tasks are extracted, they will appear
            here for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewQueue.map((item) => (
            <ReviewTaskCard
              key={item.id}
              item={item}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
