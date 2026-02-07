"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BriefingContent } from "@/types";

interface DeferSuggestionsSectionProps {
  items: BriefingContent["defer_suggestions"];
}

export function DeferSuggestionsSection({
  items,
}: DeferSuggestionsSectionProps) {
  if (items.length === 0) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-muted-foreground">
          Consider Deferring
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.task_id} className="text-sm">
              <p className="text-muted-foreground font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {item.reason}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
