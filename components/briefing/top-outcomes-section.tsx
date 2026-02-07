"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPriorityColor } from "@/lib/utils";
import type { BriefingContent } from "@/types";

interface TopOutcomesSectionProps {
  outcomes: BriefingContent["top_outcomes"];
  onTaskClick?: (taskId: string) => void;
}

export function TopOutcomesSection({
  outcomes,
  onTaskClick,
}: TopOutcomesSectionProps) {
  if (outcomes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Top 3 Outcomes for Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {outcomes.map((outcome, index) => (
          <div
            key={outcome.task_id}
            className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
            onClick={() => onTaskClick?.(outcome.task_id)}
            data-testid={`outcome-${index}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium leading-snug">{outcome.title}</p>
              <Badge
                variant="secondary"
                className={`mt-1 text-xs ${getPriorityColor(outcome.priority)}`}
              >
                {outcome.priority}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
