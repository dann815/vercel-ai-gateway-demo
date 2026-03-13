"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MessageMetadata } from "@/lib/message-metadata";
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

export function MessageMeta({ metadata }: { metadata?: MessageMetadata }) {
  const [expanded, setExpanded] = useState(false);

  if (!metadata) return null;

  const hasDetails =
    metadata.inputTokens != null || metadata.streamingMs != null;

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
        <Pill>{metadata.ttftMs}ms TTFT</Pill>
      )}

      {metadata.streamingMs != null && (
        <Pill>{(metadata.streamingMs / 1000).toFixed(1)}s streaming</Pill>
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
          {metadata.estimatedCost != null && (
            <Pill>{formatCost(metadata.estimatedCost)}</Pill>
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
