"use client";

import { Target, Sparkles } from "lucide-react";
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
  // Show encouraging message when there are no outcomes
  if (outcomes.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6 pb-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No high-priority tasks for today.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Great time to work on longer-term goals!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Top 3 Outcomes for Today
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Focus on these for maximum impact
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {outcomes.map((outcome, index) => (
          <div
            key={outcome.task_id}
            className="flex items-start gap-3 cursor-pointer hover:bg-background/80 rounded-lg p-3 -mx-3 transition-all duration-200 group"
            onClick={() => onTaskClick?.(outcome.task_id)}
            data-testid={`outcome-${index}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm group-hover:scale-110 transition-transform">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium leading-snug group-hover:text-primary transition-colors">
                {outcome.title}
              </p>
              <Badge
                variant="secondary"
                className={`mt-1.5 text-xs ${getPriorityColor(outcome.priority)}`}
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
