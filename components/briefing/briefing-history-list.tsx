"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Briefing } from "@/types";

interface BriefingHistoryListProps {
  briefings: Briefing[];
  loading: boolean;
  onSelect?: (briefingId: string) => void;
}

export function BriefingHistoryList({
  briefings,
  loading,
  onSelect,
}: BriefingHistoryListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (briefings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No previous briefings yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {briefings.map((briefing) => (
        <Card
          key={briefing.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onSelect?.(briefing.id)}
        >
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{formatDate(briefing.date)}</p>
              {briefing.content.summary && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {briefing.content.summary.total_tasks} tasks
                  {briefing.content.summary.urgent_count > 0 &&
                    ` \u00B7 ${briefing.content.summary.urgent_count} urgent`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {briefing.content.overdue.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {briefing.content.overdue.length} overdue
                </Badge>
              )}
              {briefing.feedback === "thumbs_up" && (
                <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
              )}
              {briefing.feedback === "thumbs_down" && (
                <ThumbsDown className="h-3.5 w-3.5 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
