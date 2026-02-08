"use client";

import { CheckCircle2, AlertTriangle, ListTodo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BriefingContent } from "@/types";

interface SummaryStatsProps {
  summary: BriefingContent["summary"];
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  if (!summary) return null;

  const stats = [
    {
      label: "Total Tasks",
      value: summary.total_tasks,
      icon: ListTodo,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Urgent",
      value: summary.urgent_count,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Completed Today",
      value: summary.completed_today,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p
                  className="text-2xl font-bold tabular-nums"
                  data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
