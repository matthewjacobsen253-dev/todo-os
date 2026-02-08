"use client";

import { useEffect, useState } from "react";
import { Settings, RefreshCw, Sun, Moon, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBriefingWithSync } from "@/hooks/useBriefing";
import { useUIActions, useCurrentWorkspace } from "@/store";
import { TopOutcomesSection } from "./top-outcomes-section";
import { MustDoSection } from "./must-do-section";
import { WaitingOnSection } from "./waiting-on-section";
import { DeferSuggestionsSection } from "./defer-suggestions-section";
import { OverdueSection } from "./overdue-section";
import { SummaryStats } from "./summary-stats";
import { FeedbackWidget } from "./feedback-widget";
import { PreferencesDialog } from "./preferences-dialog";
import { BriefingHistoryList } from "./briefing-history-list";

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour < 12) {
    return {
      text: "Good morning",
      icon: <Sunrise className="h-6 w-6 text-amber-500" />,
    };
  } else if (hour < 18) {
    return {
      text: "Good afternoon",
      icon: <Sun className="h-6 w-6 text-yellow-500" />,
    };
  } else {
    return {
      text: "Good evening",
      icon: <Moon className="h-6 w-6 text-indigo-400" />,
    };
  }
}

function formatBriefingDate(dateStr?: string): string {
  if (!dateStr) return "Today";
  const date = new Date(dateStr);
  const today = new Date();
  const isToday =
    date.toISOString().split("T")[0] === today.toISOString().split("T")[0];
  if (isToday) return "Today";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function BriefingPageContent() {
  const {
    briefing,
    loading,
    generating,
    generate,
    giveFeedback,
    history,
    historyLoading,
    loadHistory,
    preferences,
    preferencesLoading: _preferencesLoading,
    loadPreferences,
    savePreferences,
  } = useBriefingWithSync();
  const { openTaskDetail } = useUIActions();
  const currentWorkspace = useCurrentWorkspace();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  const greeting = getGreeting();

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleOpenPrefs = () => {
    loadPreferences();
    setPrefsOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {greeting.icon}
          <div>
            <h1 className="text-2xl font-bold">{greeting.text}</h1>
            <p className="text-sm text-muted-foreground">
              {currentWorkspace?.name
                ? `Daily briefing for ${currentWorkspace.name}`
                : "Daily Briefing"}
              {" • "}
              {formatBriefingDate(briefing?.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenPrefs}
            title="Briefing Preferences"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={generating}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`}
            />
            {briefing ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6 mt-6">
          {!briefing ? (
            <div className="text-center py-16 space-y-4 bg-muted/20 rounded-lg border border-dashed">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">
                  Ready for your daily briefing?
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Generate a personalized overview of your tasks, priorities,
                  and what needs your attention today.
                </p>
              </div>
              <Button onClick={generate} disabled={generating} size="lg">
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Generate Briefing
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Summary Stats — Always at top */}
              <SummaryStats summary={briefing.content.summary} />

              {/* Top 3 Outcomes — Primary focus */}
              <TopOutcomesSection
                outcomes={briefing.content.top_outcomes}
                onTaskClick={openTaskDetail}
              />

              {/* Must Do Today — Critical tasks */}
              <MustDoSection
                items={briefing.content.must_do}
                onTaskClick={openTaskDetail}
              />

              {/* Overdue Items — Requires immediate attention */}
              <OverdueSection
                items={briefing.content.overdue}
                onTaskClick={openTaskDetail}
              />

              {/* Waiting On — Blockers */}
              <WaitingOnSection
                items={briefing.content.waiting_on}
                onTaskClick={openTaskDetail}
              />

              {/* Defer Suggestions — Optional section */}
              <DeferSuggestionsSection
                items={briefing.content.defer_suggestions}
              />

              {/* Feedback */}
              <div className="flex justify-center pt-6 border-t">
                <FeedbackWidget
                  currentFeedback={briefing.feedback}
                  onFeedback={giveFeedback}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <BriefingHistoryList briefings={history} loading={historyLoading} />
        </TabsContent>
      </Tabs>

      <PreferencesDialog
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        preferences={preferences}
        onSave={savePreferences}
      />
    </div>
  );
}
