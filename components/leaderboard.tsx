"use client";

import { useEffect, useState, useMemo } from "react";
import { BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMetrics } from "@/lib/metrics/metrics-context";
import type { ModelStats } from "@/lib/metrics/schemas";
import { cn } from "@/lib/utils";

type SortKey =
  | "requestCount"
  | "avgTtftMs"
  | "avgStreamingMs"
  | "avgTokensPerSecond"
  | "avgCost";

const COLUMNS: { key: SortKey; label: string; lower?: boolean }[] = [
  { key: "requestCount", label: "Requests" },
  { key: "avgTtftMs", label: "Avg TTFT", lower: true },
  { key: "avgStreamingMs", label: "Avg Streaming", lower: true },
  { key: "avgTokensPerSecond", label: "Tok/s" },
  { key: "avgCost", label: "Avg Cost", lower: true },
];

function formatModelName(modelId: string): string {
  return modelId.split("/").pop() ?? modelId;
}

function formatValue(key: SortKey, value: number | undefined): string {
  if (value == null) return "—";
  switch (key) {
    case "requestCount":
      return String(value);
    case "avgTtftMs":
      return `${Math.round(value)}ms`;
    case "avgStreamingMs":
      return `${(value / 1000).toFixed(1)}s`;
    case "avgTokensPerSecond":
      return `${value.toFixed(1)}`;
    case "avgCost":
      return value < 0.0001 ? "<$0.0001" : `$${value.toFixed(4)}`;
  }
}

function bestValue(
  data: ModelStats[],
  key: SortKey,
  lower?: boolean,
): number | undefined {
  const values = data
    .map((s) => s[key] as number | undefined)
    .filter((v): v is number => v != null);
  if (values.length === 0) return undefined;
  return lower ? Math.min(...values) : Math.max(...values);
}

function LeaderboardTable({
  data,
  sortKey,
  sortAsc,
  onSort,
}: {
  data: ModelStats[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = (a[sortKey] as number | undefined) ?? 0;
      const bv = (b[sortKey] as number | undefined) ?? 0;
      return sortAsc ? av - bv : bv - av;
    });
  }, [data, sortKey, sortAsc]);

  const bests = useMemo(() => {
    const map: Partial<Record<SortKey, number>> = {};
    for (const col of COLUMNS) {
      map[col.key] = bestValue(data, col.key, col.lower);
    }
    return map;
  }, [data]);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/60 text-center py-8">
        No data yet. Send some messages to start tracking.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-muted/40">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">
              Model
            </th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="text-right py-2 px-2">
                <button
                  onClick={() => onSort(col.key)}
                  className={cn(
                    "font-medium hover:text-foreground transition-colors",
                    sortKey === col.key
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-0.5">{sortAsc ? "↑" : "↓"}</span>
                  )}
                </button>
              </th>
            ))}
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">
              Complexity
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.modelId}
              className="border-b border-muted/20 hover:bg-muted/20 transition-colors"
            >
              <td className="py-2 px-2 font-medium">
                {formatModelName(s.modelId)}
              </td>
              {COLUMNS.map((col) => {
                const val = s[col.key] as number | undefined;
                const isBest = val != null && val === bests[col.key];
                return (
                  <td
                    key={col.key}
                    className={cn(
                      "text-right py-2 px-2 tabular-nums",
                      isBest && "text-green-600 dark:text-green-400 font-medium",
                    )}
                  >
                    {formatValue(col.key, val)}
                  </td>
                );
              })}
              <td className="text-right py-2 px-2 tabular-nums text-muted-foreground">
                {s.complexityBreakdown.simple > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {s.complexityBreakdown.simple}s
                  </span>
                )}
                {s.complexityBreakdown.moderate > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                    {s.complexityBreakdown.moderate}m
                  </span>
                )}
                {s.complexityBreakdown.complex > 0 && (
                  <span className="text-red-500 dark:text-red-400 ml-1">
                    {s.complexityBreakdown.complex}c
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Leaderboard() {
  const { stats, globalStats, refreshGlobalStats } = useMetrics();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"session" | "global">("session");
  const [sortKey, setSortKey] = useState<SortKey>("avgTtftMs");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (open && tab === "global") {
      refreshGlobalStats();
    }
  }, [open, tab, refreshGlobalStats]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      const col = COLUMNS.find((c) => c.key === key);
      setSortAsc(col?.lower ?? false);
    }
  };

  const data = tab === "session" ? stats : globalStats;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="icon"
        className="h-9 w-9 shadow-border-small hover:shadow-border-medium bg-background/80 backdrop-blur-sm border-0 hover:bg-background hover:scale-[1.02] transition-all duration-150 ease"
        aria-label="Model leaderboard"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-3xl mx-4 rounded-2xl glass-effect shadow-border-medium p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Model Leaderboard</h2>
              <Button
                onClick={() => setOpen(false)}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-1 mb-4">
              <button
                onClick={() => setTab("session")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  tab === "session"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                Your Session
              </button>
              <button
                onClick={() => setTab("global")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  tab === "global"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                Global
              </button>
            </div>

            <LeaderboardTable
              data={data}
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
            />
          </div>
        </div>
      )}
    </>
  );
}
