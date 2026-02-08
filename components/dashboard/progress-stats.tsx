"use client";

import { useMemo } from "react";
import { CheckCircle2, Flame, TrendingUp, Target } from "lucide-react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          color,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {subtext && (
          <p className="text-[10px] text-muted-foreground/70">{subtext}</p>
        )}
      </div>
    </div>
  );
}

export function ProgressStats() {
  const tasks = useStore((state) => state.tasks);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Tasks completed today
    const completedToday = tasks.filter((t) => {
      if (t.status !== "done" || !t.updated_at) return false;
      const updatedDate = new Date(t.updated_at).toISOString().split("T")[0];
      return updatedDate === today;
    }).length;

    // Weekly completion rate
    const completedThisWeek = tasks.filter((t) => {
      if (t.status !== "done" || !t.updated_at) return false;
      const updatedDate = new Date(t.updated_at).toISOString().split("T")[0];
      return updatedDate >= weekAgo;
    }).length;

    // Calculate daily average this week
    const dailyAverage = Math.round((completedThisWeek / 7) * 10) / 10;

    // Simple streak calculation (consecutive days with completions)
    // This is a simplified version - a real implementation would query the server
    const streak = calculateStreak(tasks);

    // Active tasks (not done, not cancelled)
    const activeTasks = tasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled",
    ).length;

    return {
      completedToday,
      weeklyTotal: completedThisWeek,
      dailyAverage,
      streak,
      activeTasks,
    };
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
        label="Completed Today"
        value={stats.completedToday}
        color="bg-green-100 dark:bg-green-900/30"
      />
      <StatCard
        icon={<Flame className="h-5 w-5 text-orange-500" />}
        label="Day Streak"
        value={stats.streak}
        subtext={stats.streak > 0 ? "Keep it going!" : "Start today!"}
        color="bg-orange-100 dark:bg-orange-900/30"
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
        label="This Week"
        value={stats.weeklyTotal}
        subtext={`~${stats.dailyAverage}/day avg`}
        color="bg-blue-100 dark:bg-blue-900/30"
      />
      <StatCard
        icon={<Target className="h-5 w-5 text-purple-500" />}
        label="Active Tasks"
        value={stats.activeTasks}
        color="bg-purple-100 dark:bg-purple-900/30"
      />
    </div>
  );
}

// Calculate streak from tasks (simplified - looks at updated_at dates)
function calculateStreak(tasks: { status: string; updated_at: string }[]) {
  const completedDates = new Set<string>();

  tasks.forEach((t) => {
    if (t.status === "done" && t.updated_at) {
      const date = new Date(t.updated_at).toISOString().split("T")[0];
      completedDates.add(date);
    }
  });

  // Sort dates in descending order
  const sortedDates = Array.from(completedDates).sort((a, b) =>
    b.localeCompare(a),
  );

  if (sortedDates.length === 0) return 0;

  // Check if today or yesterday has completions
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0; // Streak broken
  }

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays =
      (prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Compact version for smaller spaces
export function ProgressStatsCompact() {
  const tasks = useStore((state) => state.tasks);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const completedToday = tasks.filter((t) => {
      if (t.status !== "done" || !t.updated_at) return false;
      const updatedDate = new Date(t.updated_at).toISOString().split("T")[0];
      return updatedDate === today;
    }).length;

    const activeTasks = tasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled",
    ).length;

    return { completedToday, activeTasks };
  }, [tasks]);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="font-medium">{stats.completedToday}</span>
        <span className="text-muted-foreground">done today</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <Target className="h-4 w-4 text-purple-500" />
        <span className="font-medium">{stats.activeTasks}</span>
        <span className="text-muted-foreground">remaining</span>
      </div>
    </div>
  );
}
