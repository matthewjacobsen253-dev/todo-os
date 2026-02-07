"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { BriefingContent } from "@/types";

interface SummaryStatsProps {
  summary: BriefingContent["summary"];
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  if (!summary) return null;

  const stats = [
    { label: "Total Tasks", value: summary.total_tasks },
    { label: "Urgent", value: summary.urgent_count },
    { label: "Completed Today", value: summary.completed_today },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6 text-center">
            <p
              className="text-2xl font-bold"
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
