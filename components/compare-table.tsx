"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageMetadata } from "@/lib/message-metadata";

type MetricDef = {
  key: string;
  label: string;
  getValue: (m: MessageMetadata) => number | undefined;
  format: (v: number) => string;
  lowerIsBetter: boolean;
};

const METRICS: MetricDef[] = [
  {
    key: "classificationMs",
    label: "Classify",
    getValue: (m) => m.classificationMs,
    format: (v) => `${(v / 1000).toFixed(1)}s`,
    lowerIsBetter: true,
  },
  {
    key: "ttftMs",
    label: "TTFT",
    getValue: (m) => m.ttftMs,
    format: (v) => `${v}ms`,
    lowerIsBetter: true,
  },
  {
    key: "streamingMs",
    label: "Stream",
    getValue: (m) => m.streamingMs,
    format: (v) => `${(v / 1000).toFixed(1)}s`,
    lowerIsBetter: true,
  },
  {
    key: "tokPerSec",
    label: "Tok/s",
    getValue: (m) =>
      m.outputTokens != null && m.streamingMs != null && m.streamingMs > 0
        ? m.outputTokens / (m.streamingMs / 1000)
        : undefined,
    format: (v) => v.toFixed(1),
    lowerIsBetter: false,
  },
  {
    key: "outputTokens",
    label: "Tokens",
    getValue: (m) => m.outputTokens,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
  {
    key: "estimatedCost",
    label: "Cost",
    getValue: (m) => m.estimatedCost,
    format: (v) => (v < 0.0001 ? "<$0.0001" : `$${v.toFixed(4)}`),
    lowerIsBetter: true,
  },
];

function hue(percent: number): string {
  const h = Math.round(percent * 120);
  return `hsl(${h} 70% 45% / 0.25)`;
}

function formatModelName(modelId: string): string {
  return modelId.split("/").pop() ?? modelId;
}

type SortState = { key: string; asc: boolean } | null;

export function CompareTable({
  modelIds,
  completedMetadata,
}: {
  modelIds: string[];
  completedMetadata: Record<string, MessageMetadata>;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [expanded, setExpanded] = useState(false);

  if (modelIds.length === 0) return null;

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? { key, asc: !prev.asc } : { key, asc: true }
    );
  };

  // Build rows with optional metadata
  let rows = modelIds.map((id) => ({
    modelId: id,
    metadata: completedMetadata[id] as MessageMetadata | undefined,
  }));

  // Sort if active
  if (sort) {
    const metric = METRICS.find((m) => m.key === sort.key);
    if (metric) {
      rows = [...rows].sort((a, b) => {
        const va = a.metadata ? metric.getValue(a.metadata) : undefined;
        const vb = b.metadata ? metric.getValue(b.metadata) : undefined;
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return sort.asc ? va - vb : vb - va;
      });
    }
  }

  // Compute min/max per metric across available data
  const ranges = METRICS.map((metric) => {
    const values = Object.values(completedMetadata)
      .map((m) => metric.getValue(m))
      .filter((v): v is number => v != null);
    if (values.length === 0) return null;
    return { min: Math.min(...values), max: Math.max(...values) };
  });

  return (
    <div className="px-4 md:px-8 pb-2">
      <div className="flex justify-center">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-150",
            expanded
              ? "bg-foreground text-background"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
        >
          <Table2 className="h-3 w-3" />
          Summary
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-150",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>
      {expanded && (
      <div className="overflow-x-auto rounded-xl glass-effect shadow-border-small mt-2">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">
                Model
              </th>
              {METRICS.map((m) => (
                <th
                  key={m.key}
                  className="text-right px-2 py-1.5 text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort(m.key)}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    {m.label}
                    {sort?.key === m.key && (
                      sort.asc ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.modelId}
                className={cn(
                  "border-b border-border/30 last:border-0",
                  !row.metadata && "opacity-40"
                )}
              >
                <td className="px-2 py-1.5 font-semibold text-foreground whitespace-nowrap">
                  {formatModelName(row.modelId)}
                </td>
                {METRICS.map((metric, mi) => {
                  const value = row.metadata
                    ? metric.getValue(row.metadata)
                    : undefined;
                  const range = ranges[mi];
                  let bg: string | undefined;

                  if (value != null && range && range.max !== range.min) {
                    const normalized =
                      (value - range.min) / (range.max - range.min);
                    const percent = metric.lowerIsBetter
                      ? 1 - normalized
                      : normalized;
                    bg = hue(percent);
                  } else if (
                    value != null &&
                    range &&
                    range.max === range.min
                  ) {
                    bg = hue(1);
                  }

                  return (
                    <td
                      key={metric.key}
                      className="text-right px-2 py-1.5 whitespace-nowrap"
                      style={bg ? { backgroundColor: bg } : undefined}
                    >
                      {value != null ? metric.format(value) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
