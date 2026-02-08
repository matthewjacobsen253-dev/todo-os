"use client";

import { ThumbsUp, ThumbsDown, Calendar, ListTodo } from "lucide-react";
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
          <div
            key={i}
            className="h-20 bg-muted animate-pulse rounded-lg"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  if (briefings.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
        <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No previous briefings.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Generate your first briefing to start tracking history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {briefings.map((briefing) => (
        <Card
          key={briefing.id}
          className="cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
          onClick={() => onSelect?.(briefing.id)}
        >
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {formatDate(briefing.date)}
                </p>
                {briefing.content.summary && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ListTodo className="h-3 w-3" />
                      {briefing.content.summary.total_tasks} tasks
                    </span>
                    {briefing.content.summary.urgent_count > 0 && (
                      <span className="text-xs text-amber-600">
                        {briefing.content.summary.urgent_count} urgent
                      </span>
                    )}
                    {briefing.content.summary.completed_today > 0 && (
                      <span className="text-xs text-green-600">
                        {briefing.content.summary.completed_today} done
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {briefing.content.overdue &&
                briefing.content.overdue.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {briefing.content.overdue.length} overdue
                  </Badge>
                )}
              {briefing.content.top_outcomes &&
                briefing.content.top_outcomes.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {briefing.content.top_outcomes.length} priorities
                  </Badge>
                )}
              {briefing.feedback === "thumbs_up" && (
                <div className="p-1 rounded-full bg-green-100">
                  <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                </div>
              )}
              {briefing.feedback === "thumbs_down" && (
                <div className="p-1 rounded-full bg-red-100">
                  <ThumbsDown className="h-3.5 w-3.5 text-red-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
