"use client";

import { useEffect, useState } from "react";
import { Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBriefingWithSync } from "@/hooks/useBriefing";
import { useUIActions } from "@/store";
import { TopOutcomesSection } from "./top-outcomes-section";
import { MustDoSection } from "./must-do-section";
import { WaitingOnSection } from "./waiting-on-section";
import { DeferSuggestionsSection } from "./defer-suggestions-section";
import { OverdueSection } from "./overdue-section";
import { SummaryStats } from "./summary-stats";
import { FeedbackWidget } from "./feedback-widget";
import { PreferencesDialog } from "./preferences-dialog";
import { BriefingHistoryList } from "./briefing-history-list";

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

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Briefing</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleOpenPrefs}>
            <Settings className="h-4 w-4" />
          </Button>
          {briefing && (
            <Button
              variant="outline"
              size="sm"
              onClick={generate}
              disabled={generating}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`}
              />
              Regenerate
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6 mt-6">
          {!briefing ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground">
                No briefing generated for today yet.
              </p>
              <Button onClick={generate} disabled={generating}>
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Briefing"
                )}
              </Button>
            </div>
          ) : (
            <>
              <SummaryStats summary={briefing.content.summary} />

              <TopOutcomesSection
                outcomes={briefing.content.top_outcomes}
                onTaskClick={openTaskDetail}
              />

              <MustDoSection
                items={briefing.content.must_do}
                onTaskClick={openTaskDetail}
              />

              <OverdueSection
                items={briefing.content.overdue}
                onTaskClick={openTaskDetail}
              />

              <WaitingOnSection
                items={briefing.content.waiting_on}
                onTaskClick={openTaskDetail}
              />

              <DeferSuggestionsSection
                items={briefing.content.defer_suggestions}
              />

              <div className="flex justify-center pt-4 border-t">
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
