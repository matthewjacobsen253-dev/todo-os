"use client";

import { CalendarClock, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BriefingContent } from "@/types";

interface DeferSuggestionsSectionProps {
  items: BriefingContent["defer_suggestions"];
}

export function DeferSuggestionsSection({
  items,
}: DeferSuggestionsSectionProps) {
  // Don't show anything if no suggestions (this section is optional)
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed border-muted-foreground/20 bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-muted-foreground flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Consider Deferring
        </CardTitle>
        <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
          <Lightbulb className="h-3 w-3" />
          AI-suggested tasks that can wait
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.task_id}
              className="text-sm border-l-2 border-muted-foreground/20 pl-3"
              data-testid={`defer-${item.task_id}`}
            >
              <p className="text-muted-foreground font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                &ldquo;{item.reason}&rdquo;
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
