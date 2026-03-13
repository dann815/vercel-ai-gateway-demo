"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MessageMetadata } from "@/lib/message-metadata";
import { useMetrics } from "@/lib/metrics/metrics-context";
import { cn } from "@/lib/utils";

const complexityColors: Record<string, string> = {
  simple: "bg-green-500/15 text-green-700 dark:text-green-400",
  moderate: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  complex: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide",
        "bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function formatCost(cost: number): string {
  if (cost < 0.0001) return "<$0.0001";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

function formatModelName(modelId: string): string {
  return modelId.split("/").pop() ?? modelId;
}

function VsAvg({ value, avg, lower }: { value: number; avg: number | undefined; lower?: boolean }) {
  if (avg == null) return null;
  const diff = value - avg;
  const pct = avg > 0 ? Math.round((diff / avg) * 100) : 0;
  if (pct === 0) return null;
  const better = lower ? diff < 0 : diff > 0;
  return (
    <span className={cn("text-[10px] ml-0.5", better ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400")}>
      {better ? "↓" : "↑"}{Math.abs(pct)}%
    </span>
  );
}

export function MessageMeta({ metadata }: { metadata?: MessageMetadata }) {
  const [expanded, setExpanded] = useState(false);
  const { stats } = useMetrics();

  if (!metadata) return null;

  const modelStats = metadata.modelId
    ? stats.find((s) => s.modelId === metadata.modelId)
    : undefined;

  const hasDetails =
    metadata.inputTokens != null || metadata.streamingMs != null;

  const tokensPerSecond =
    metadata.outputTokens != null && metadata.streamingMs != null && metadata.streamingMs > 0
      ? metadata.outputTokens / (metadata.streamingMs / 1000)
      : undefined;

  const totalResponseMs =
    (metadata.classificationMs ?? 0) + (metadata.ttftMs ?? 0) + (metadata.streamingMs ?? 0);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 animate-fade-in">
      {metadata.modelId && (
        <Pill>{formatModelName(metadata.modelId)}</Pill>
      )}

      {metadata.classificationMs != null && (
        <Pill>{(metadata.classificationMs / 1000).toFixed(1)}s classify</Pill>
      )}

      {metadata.complexity && (
        <Pill className={complexityColors[metadata.complexity]}>
          {metadata.complexity}
        </Pill>
      )}

      {metadata.ttftMs != null && (
        <Pill>
          {metadata.ttftMs}ms TTFT
          <VsAvg value={metadata.ttftMs} avg={modelStats?.avgTtftMs} lower />
        </Pill>
      )}

      {metadata.streamingMs != null && (
        <Pill>
          {(metadata.streamingMs / 1000).toFixed(1)}s streaming
          <VsAvg value={metadata.streamingMs} avg={modelStats?.avgStreamingMs} lower />
        </Pill>
      )}

      {hasDetails && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
          aria-label="Toggle details"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-150",
              expanded && "rotate-180",
            )}
          />
        </button>
      )}

      {expanded && hasDetails && (
        <div className="w-full flex flex-wrap items-center gap-1.5 mt-1 animate-fade-in">
          {metadata.inputTokens != null && (
            <Pill>
              {metadata.inputTokens + (metadata.outputTokens ?? 0)} tokens
            </Pill>
          )}
          {metadata.inputTokens != null && metadata.outputTokens != null && (
            <Pill>
              {metadata.inputTokens}↑ {metadata.outputTokens}↓
            </Pill>
          )}
          {tokensPerSecond != null && (
            <Pill>
              {tokensPerSecond.toFixed(1)} tok/s
              <VsAvg value={tokensPerSecond} avg={modelStats?.avgTokensPerSecond}  />
            </Pill>
          )}
          {metadata.estimatedCost != null && (
            <Pill>{formatCost(metadata.estimatedCost)}</Pill>
          )}
          {totalResponseMs > 0 && (
            <Pill>{(totalResponseMs / 1000).toFixed(1)}s total</Pill>
          )}
          {metadata.justification && (
            <span className="text-[11px] text-muted-foreground/50 italic">
              {metadata.justification}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
