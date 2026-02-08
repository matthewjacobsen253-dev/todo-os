"use client";

import { useState, useCallback } from "react";

interface ExtractedTask {
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  confidence_score: number;
}

interface ExtractionResult {
  message_id: string;
  subject: string;
  from: string;
  extracted_tasks: ExtractedTask[];
  expected_task_count: number;
  actual_task_count: number;
  match: boolean;
  error: string | null;
}

interface Summary {
  total_processed: number;
  total_expected_tasks: number;
  total_extracted_tasks: number;
  tasks_created_in_db: number;
  detection_accuracy: string;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  precision: string;
  recall: string;
  f1_score: string;
}

interface ResultsData {
  summary: Summary;
  results: ExtractionResult[];
}

export default function EmailExtractionTest() {
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [startIdx, setStartIdx] = useState(1);
  const [endIdx, setEndIdx] = useState(10);
  const [createTasks, setCreateTasks] = useState(false);
  const [filter, setFilter] = useState<"all" | "match" | "mismatch">("all");

  const runExtraction = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress("Processing emails through Claude extractor...");

    try {
      const params = new URLSearchParams({
        start: startIdx.toString(),
        end: endIdx.toString(),
      });
      if (createTasks) {
        params.set("create_tasks", "true");
      }

      const res = await fetch(`/api/test/extract?${params}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: ResultsData = await res.json();
      setResults(data);
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }, [startIdx, endIdx, createTasks]);

  const loadPrevious = useCallback(async () => {
    try {
      const res = await fetch("/api/test/extract");
      if (res.ok) {
        const data: ResultsData = await res.json();
        setResults(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const filteredResults = results?.results.filter((r) => {
    if (filter === "match") return r.match;
    if (filter === "mismatch") return !r.match;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          Email-to-Task Extraction Test
        </h1>
        <p className="text-gray-400 mb-8">
          Feed synthetic emails through the Claude extractor and compare results
          against ground truth.
        </p>

        {/* Controls */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Start Email
              </label>
              <input
                type="number"
                min={1}
                max={125}
                value={startIdx}
                onChange={(e) => setStartIdx(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-24 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                End Email
              </label>
              <input
                type="number"
                min={1}
                max={125}
                value={endIdx}
                onChange={(e) => setEndIdx(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-24 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createTasks"
                checked={createTasks}
                onChange={(e) => setCreateTasks(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="createTasks" className="text-sm text-gray-400">
                Create tasks in DB
              </label>
            </div>
            <button
              onClick={runExtraction}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium px-6 py-2 rounded transition-colors"
            >
              {loading ? "Processing..." : "Run Extraction"}
            </button>
            <button
              onClick={loadPrevious}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded transition-colors"
            >
              Load Previous Results
            </button>
          </div>
          {progress && (
            <p className="mt-4 text-yellow-400 animate-pulse">{progress}</p>
          )}
          {error && <p className="mt-4 text-red-400">Error: {error}</p>}
        </div>

        {/* Summary */}
        {results && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard
                label="Emails Processed"
                value={results.summary.total_processed}
              />
              <MetricCard
                label="Detection Accuracy"
                value={results.summary.detection_accuracy}
                highlight
              />
              <MetricCard label="Precision" value={results.summary.precision} />
              <MetricCard label="Recall" value={results.summary.recall} />
              <MetricCard label="F1 Score" value={results.summary.f1_score} />
              <MetricCard
                label="Expected Tasks"
                value={results.summary.total_expected_tasks}
              />
              <MetricCard
                label="Extracted Tasks"
                value={results.summary.total_extracted_tasks}
              />
              <MetricCard
                label="Tasks Created"
                value={results.summary.tasks_created_in_db}
              />
            </div>

            {/* Confusion Matrix */}
            <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Confusion Matrix</h2>
              <div className="grid grid-cols-3 gap-2 max-w-md text-center text-sm">
                <div />
                <div className="text-gray-400 font-medium">Predicted Task</div>
                <div className="text-gray-400 font-medium">
                  Predicted No Task
                </div>
                <div className="text-gray-400 font-medium text-right pr-2">
                  Actual Task
                </div>
                <div className="bg-green-900/50 border border-green-800 rounded p-3">
                  <div className="text-2xl font-bold text-green-400">
                    {results.summary.true_positives}
                  </div>
                  <div className="text-xs text-gray-400">True Positive</div>
                </div>
                <div className="bg-red-900/50 border border-red-800 rounded p-3">
                  <div className="text-2xl font-bold text-red-400">
                    {results.summary.false_negatives}
                  </div>
                  <div className="text-xs text-gray-400">False Negative</div>
                </div>
                <div className="text-gray-400 font-medium text-right pr-2">
                  Actual No Task
                </div>
                <div className="bg-red-900/50 border border-red-800 rounded p-3">
                  <div className="text-2xl font-bold text-red-400">
                    {results.summary.false_positives}
                  </div>
                  <div className="text-xs text-gray-400">False Positive</div>
                </div>
                <div className="bg-green-900/50 border border-green-800 rounded p-3">
                  <div className="text-2xl font-bold text-green-400">
                    {results.summary.true_negatives}
                  </div>
                  <div className="text-xs text-gray-400">True Negative</div>
                </div>
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {(["all", "match", "mismatch"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1 rounded text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {f === "all"
                    ? `All (${results.results.length})`
                    : f === "match"
                      ? `Matches (${results.results.filter((r) => r.match).length})`
                      : `Mismatches (${results.results.filter((r) => !r.match).length})`}
                </button>
              ))}
            </div>

            {/* Results Table */}
            <div className="space-y-3">
              {filteredResults?.map((r) => (
                <ResultRow key={r.message_id} result={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${highlight ? "text-blue-400" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: ExtractionResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-gray-900 rounded-lg border ${
        result.error
          ? "border-yellow-800"
          : result.match
            ? "border-gray-800"
            : "border-red-800"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center gap-4"
      >
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            result.match
              ? "bg-green-900 text-green-400"
              : "bg-red-900 text-red-400"
          }`}
        >
          {result.match ? "MATCH" : "MISS"}
        </span>
        <span className="text-gray-500 font-mono text-sm w-16">
          {result.message_id}
        </span>
        <span className="flex-1 truncate">{result.subject}</span>
        <span className="text-gray-500 text-sm">
          Expected: {result.expected_task_count} | Got:{" "}
          {result.actual_task_count}
        </span>
        <span className="text-gray-600">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800">
          <div className="text-sm text-gray-500 mt-2 mb-3">
            From: {result.from}
          </div>
          {result.error && (
            <div className="text-red-400 text-sm mb-2">
              Error: {result.error}
            </div>
          )}
          {result.extracted_tasks.length === 0 ? (
            <div className="text-gray-500 text-sm italic">
              No tasks extracted
            </div>
          ) : (
            <div className="space-y-2">
              {result.extracted_tasks.map((task, i) => (
                <div key={i} className="bg-gray-800 rounded p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{task.title}</span>
                    <PriorityBadge priority={task.priority} />
                    <span className="text-gray-500">
                      conf: {task.confidence_score}
                    </span>
                  </div>
                  {task.description && (
                    <div className="text-gray-400">{task.description}</div>
                  )}
                  {task.due_date && (
                    <div className="text-gray-500 mt-1">
                      Due: {task.due_date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-900 text-red-300",
    high: "bg-orange-900 text-orange-300",
    medium: "bg-yellow-900 text-yellow-300",
    low: "bg-blue-900 text-blue-300",
    none: "bg-gray-800 text-gray-400",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${colors[priority] || colors.none}`}
    >
      {priority}
    </span>
  );
}
