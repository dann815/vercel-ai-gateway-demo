"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageMetadata } from "@/lib/message-metadata";
import type { EvaluationResult } from "@/components/model-column";

type RowData = {
  metadata?: MessageMetadata;
  llamaEval?: EvaluationResult;
  geminiEval?: EvaluationResult;
};

type MetricDef = {
  key: string;
  label: string;
  group?: string;
  getValue: (d: RowData) => number | undefined;
  format: (v: number) => string;
  lowerIsBetter: boolean;
};

const METRICS: MetricDef[] = [
  // Performance
  {
    key: "totalMs",
    label: "Total",
    getValue: (d) => {
      const c = d.metadata?.classificationMs ?? 0;
      const t = d.metadata?.ttftMs;
      const s = d.metadata?.streamingMs;
      if (t == null || s == null) return undefined;
      return c + t + s;
    },
    format: (v) => `${(v / 1000).toFixed(1)}s`,
    lowerIsBetter: true,
  },
  {
    key: "classificationMs",
    label: "Classify",
    getValue: (d) => d.metadata?.classificationMs,
    format: (v) => `${(v / 1000).toFixed(1)}s`,
    lowerIsBetter: true,
  },
  {
    key: "ttftMs",
    label: "TTFT",
    getValue: (d) => d.metadata?.ttftMs,
    format: (v) => `${v}ms`,
    lowerIsBetter: true,
  },
  {
    key: "streamingMs",
    label: "Stream",
    getValue: (d) => d.metadata?.streamingMs,
    format: (v) => `${(v / 1000).toFixed(1)}s`,
    lowerIsBetter: true,
  },
  {
    key: "tokPerSec",
    label: "Tok/s",
    getValue: (d) =>
      d.metadata?.outputTokens != null &&
      d.metadata?.streamingMs != null &&
      d.metadata.streamingMs > 0
        ? d.metadata.outputTokens / (d.metadata.streamingMs / 1000)
        : undefined,
    format: (v) => v.toFixed(1),
    lowerIsBetter: false,
  },
  {
    key: "outputTokens",
    label: "Tokens",
    getValue: (d) => d.metadata?.outputTokens,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
  {
    key: "estimatedCost",
    label: "Cost",
    getValue: (d) => d.metadata?.estimatedCost,
    format: (v) => (v < 0.0001 ? "<$0.0001" : `$${v.toFixed(4)}`),
    lowerIsBetter: true,
  },
  // Llama eval
  {
    key: "llama-verbosity",
    label: "Verb.",
    group: "Llama Eval",
    getValue: (d) => d.llamaEval?.verbosity,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
  {
    key: "llama-reading",
    label: "Read.",
    group: "Llama Eval",
    getValue: (d) => d.llamaEval?.readingLevel,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
  {
    key: "llama-correctness",
    label: "Corr.",
    group: "Llama Eval",
    getValue: (d) => d.llamaEval?.correctness,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
  // Gemini eval
  {
    key: "gemini-verbosity",
    label: "Verb.",
    group: "Gemini Eval",
    getValue: (d) => d.geminiEval?.verbosity,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
  {
    key: "gemini-reading",
    label: "Read.",
    group: "Gemini Eval",
    getValue: (d) => d.geminiEval?.readingLevel,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
  {
    key: "gemini-correctness",
    label: "Corr.",
    group: "Gemini Eval",
    getValue: (d) => d.geminiEval?.correctness,
    format: (v) => String(v),
    lowerIsBetter: false,
  },
];

// Build column groups for the header
function buildGroups(): { label?: string; span: number }[] {
  const groups: { label?: string; span: number }[] = [];
  let lastGroup: string | undefined = "__initial__";
  for (const m of METRICS) {
    if (m.group === lastGroup && groups.length > 0) {
      groups[groups.length - 1].span++;
    } else {
      groups.push({ label: m.group, span: 1 });
      lastGroup = m.group;
    }
  }
  return groups;
}

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
  llamaEvals,
  geminiEvals,
}: {
  modelIds: string[];
  completedMetadata: Record<string, MessageMetadata>;
  llamaEvals: Record<string, EvaluationResult>;
  geminiEvals: Record<string, EvaluationResult>;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [expanded, setExpanded] = useState(false);

  if (modelIds.length === 0) return null;

  const columnGroups = buildGroups();
  const hasGroups = METRICS.some((m) => m.group);

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? { key, asc: !prev.asc } : { key, asc: true }
    );
  };

  // Build rows
  let rows = modelIds.map((id) => ({
    modelId: id,
    data: {
      metadata: completedMetadata[id],
      llamaEval: llamaEvals[id],
      geminiEval: geminiEvals[id],
    } as RowData,
  }));

  // Sort
  if (sort) {
    const metric = METRICS.find((m) => m.key === sort.key);
    if (metric) {
      rows = [...rows].sort((a, b) => {
        const va = metric.getValue(a.data);
        const vb = metric.getValue(b.data);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return sort.asc ? va - vb : vb - va;
      });
    }
  }

  // Compute min/max per metric
  const allData = modelIds.map((id) => ({
    metadata: completedMetadata[id],
    llamaEval: llamaEvals[id],
    geminiEval: geminiEvals[id],
  }));
  const ranges = METRICS.map((metric) => {
    const values = allData
      .map((d) => metric.getValue(d))
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
            {hasGroups && (
              <colgroup>
                <col />
                {METRICS.map((m) => (
                  <col key={m.key} />
                ))}
              </colgroup>
            )}
            <thead>
              {hasGroups && (
                <tr className="border-b border-border/30">
                  <th />
                  {columnGroups.map((g, i) => (
                    <th
                      key={i}
                      colSpan={g.span}
                      className={cn(
                        "text-center px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                        g.label
                          ? "text-muted-foreground border-l border-border/30"
                          : "text-transparent"
                      )}
                    >
                      {g.label ?? ""}
                    </th>
                  ))}
                </tr>
              )}
              <tr className="border-b border-border/50">
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">
                  Model
                </th>
                {METRICS.map((m, mi) => {
                  // Add left border for first metric in a group
                  const isGroupStart =
                    m.group && (mi === 0 || METRICS[mi - 1].group !== m.group);
                  return (
                    <th
                      key={m.key}
                      className={cn(
                        "text-right px-2 py-1.5 text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors",
                        isGroupStart && "border-l border-border/30"
                      )}
                      onClick={() => handleSort(m.key)}
                    >
                      <span className="inline-flex items-center gap-0.5 justify-end">
                        {m.label}
                        {sort?.key === m.key &&
                          (sort.asc ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasAny =
                  row.data.metadata ||
                  row.data.llamaEval ||
                  row.data.geminiEval;
                return (
                  <tr
                    key={row.modelId}
                    className={cn(
                      "border-b border-border/30 last:border-0",
                      !hasAny && "opacity-40"
                    )}
                  >
                    <td className="px-2 py-1.5 font-semibold text-foreground whitespace-nowrap">
                      {formatModelName(row.modelId)}
                    </td>
                    {METRICS.map((metric, mi) => {
                      const value = metric.getValue(row.data);
                      const range = ranges[mi];
                      let bg: string | undefined;
                      const isGroupStart =
                        metric.group &&
                        (mi === 0 || METRICS[mi - 1].group !== metric.group);

                      if (
                        value != null &&
                        range &&
                        range.max !== range.min
                      ) {
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
                          className={cn(
                            "text-right px-2 py-1.5 whitespace-nowrap",
                            isGroupStart && "border-l border-border/30"
                          )}
                          style={bg ? { backgroundColor: bg } : undefined}
                        >
                          {value != null ? metric.format(value) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
