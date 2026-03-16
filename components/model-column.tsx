"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import {
  messageMetadataSchema,
  type MessageMetadata,
} from "@/lib/message-metadata";
import { useMetrics } from "@/lib/metrics/metrics-context";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export type EvaluationResult = {
  modelId: string;
  verbosity: number;
  readingLevel: number;
  correctness: number;
  commentary: string;
};

function formatModelName(modelId: string): string {
  return modelId.split("/").pop() ?? modelId;
}

function ScorePill({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const color =
    score >= 7
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : score >= 4
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : "bg-red-500/15 text-red-700 dark:text-red-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide",
        color
      )}
    >
      {label}: {score}/10
    </span>
  );
}

function MetaPill({
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
        className
      )}
    >
      {children}
    </span>
  );
}

export function ModelColumn({
  modelId,
  prompt,
  onStatusChange,
  onComplete,
  onMetadataUpdate,
  llamaEval,
  geminiEval,
}: {
  modelId: string;
  prompt: string;
  onStatusChange: (modelId: string, status: string) => void;
  onComplete: (
    modelId: string,
    text: string,
    metadata: MessageMetadata
  ) => void;
  onMetadataUpdate?: (modelId: string, metadata: MessageMetadata) => void;
  llamaEval?: EvaluationResult;
  geminiEval?: EvaluationResult;
}) {
  const { messages, status, error, sendMessage } = useChat({
    messageMetadataSchema,
  });

  const { addRecord } = useMetrics();
  const hasSentRef = useRef(false);
  const trackedRef = useRef(false);
  const [metaExpanded, setMetaExpanded] = useState(false);

  // Auto-send the prompt on mount
  useEffect(() => {
    if (!hasSentRef.current && prompt) {
      hasSentRef.current = true;
      sendMessage({ text: prompt }, { body: { modelId } });
    }
  }, [prompt, modelId, sendMessage]);

  const assistantMsg = messages.find((m) => m.role === "assistant");
  const meta = assistantMsg
    ? (assistantMsg.metadata as MessageMetadata | undefined)
    : undefined;

  // Report status changes
  useEffect(() => {
    onStatusChange(modelId, status);
  }, [modelId, status, onStatusChange]);

  // Stream partial metadata upward as it arrives
  const lastMetaRef = useRef<string>("");
  useEffect(() => {
    if (!meta || !onMetadataUpdate) return;
    const snapshot = JSON.stringify(meta);
    if (snapshot !== lastMetaRef.current) {
      lastMetaRef.current = snapshot;
      onMetadataUpdate(modelId, meta);
    }
  }, [meta, modelId, onMetadataUpdate]);

  // When complete, report text + metadata and track metrics
  useEffect(() => {
    if (status !== "ready" || trackedRef.current) return;
    if (!assistantMsg) return;

    trackedRef.current = true;
    const completeMeta = (assistantMsg.metadata as MessageMetadata) ?? {};
    const text = assistantMsg.parts
      ?.filter(
        (p): p is { type: "text"; text: string } => p.type === "text"
      )
      .map((p) => p.text)
      .join("") ?? "";

    onComplete(modelId, text, completeMeta);

    if (completeMeta.modelId) {
      addRecord({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...completeMeta,
        modelId: completeMeta.modelId,
      });
    }
  }, [status, messages, modelId, onComplete, addRecord]);
  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";
  const isDone = status === "ready" && assistantMsg;

  const tokensPerSecond =
    meta?.outputTokens != null &&
    meta?.streamingMs != null &&
    meta.streamingMs > 0
      ? meta.outputTokens / (meta.streamingMs / 1000)
      : undefined;

  return (
    <div className="flex flex-col min-w-[340px] max-w-[420px] flex-shrink-0 h-full rounded-2xl glass-effect shadow-border-medium animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold truncate">
            {formatModelName(modelId)}
          </span>
          {isSubmitted && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {isStreaming && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
          {isDone && !error && (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          )}
          {error && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>
        {meta?.ttftMs != null && (
          <MetaPill>{meta.ttftMs}ms TTFT</MetaPill>
        )}
      </div>

      {/* Streaming body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed hide-scrollbar">
        {isSubmitted && !assistantMsg && (
          <div className="flex items-center gap-1.5 py-2 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
            <span
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}

        {assistantMsg?.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <Streamdown
                key={`${assistantMsg.id}-${i}`}
                isAnimating={
                  isStreaming &&
                  assistantMsg.id ===
                    messages[messages.length - 1]?.id
                }
              >
                {part.text}
              </Streamdown>
            );
          }
          return null;
        })}

        {error && (
          <div className="text-red-500 dark:text-red-400 text-xs mt-2">
            {error.message || "An error occurred"}
          </div>
        )}
      </div>

      {/* Metadata footer — pinned at bottom, populates as data arrives */}
      {meta && (
        <div className="px-4 py-2 border-t border-border/50 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {meta.classificationMs != null && (
              <MetaPill>
                {(meta.classificationMs / 1000).toFixed(1)}s classify
              </MetaPill>
            )}
            {meta.complexity && (
              <MetaPill
                className={cn(
                  meta.complexity === "simple" &&
                    "bg-green-500/15 text-green-700 dark:text-green-400",
                  meta.complexity === "moderate" &&
                    "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
                  meta.complexity === "complex" &&
                    "bg-red-500/15 text-red-700 dark:text-red-400"
                )}
              >
                {meta.complexity}
              </MetaPill>
            )}
            {meta.ttftMs != null && (
              <MetaPill>{meta.ttftMs}ms TTFT</MetaPill>
            )}
            {meta.streamingMs != null && (
              <MetaPill>
                {(meta.streamingMs / 1000).toFixed(1)}s stream
              </MetaPill>
            )}
            {tokensPerSecond != null && (
              <MetaPill>{tokensPerSecond.toFixed(1)} tok/s</MetaPill>
            )}
            {meta.outputTokens != null && (
              <MetaPill>{meta.outputTokens} tokens</MetaPill>
            )}
            {meta.estimatedCost != null && (
              <MetaPill>
                {meta.estimatedCost < 0.0001
                  ? "<$0.0001"
                  : `$${meta.estimatedCost.toFixed(4)}`}
              </MetaPill>
            )}
            {meta.inputTokens != null && (
              <MetaPill>
                {meta.inputTokens}↑ {meta.outputTokens ?? 0}↓
              </MetaPill>
            )}
          </div>
        </div>
      )}

      {/* Evaluation & classification justification — behind dropdown */}
      {(llamaEval || geminiEval || meta?.justification) && (
        <div className="px-4 py-2 border-t border-border/50 space-y-1.5">
          <button
            onClick={() => setMetaExpanded((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide cursor-pointer transition-all duration-150",
              metaExpanded
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            Evaluation
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-150",
                metaExpanded && "rotate-180"
              )}
            />
          </button>
          {metaExpanded && (
            <div className="space-y-3 animate-fade-in">
              {meta?.justification && (
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Classification Justification
                  </div>
                  <p className="text-[11px] text-muted-foreground/50 italic leading-snug">
                    {meta.justification}
                  </p>
                </div>
              )}
              {llamaEval && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Llama 3.1 8B Eval
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ScorePill label="Verbosity" score={llamaEval.verbosity} />
                    <ScorePill label="Reading" score={llamaEval.readingLevel} />
                    <ScorePill label="Correctness" score={llamaEval.correctness} />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 italic leading-snug">
                    {llamaEval.commentary}
                  </p>
                </div>
              )}
              {geminiEval && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Gemini Flash Eval
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ScorePill label="Verbosity" score={geminiEval.verbosity} />
                    <ScorePill label="Reading" score={geminiEval.readingLevel} />
                    <ScorePill label="Correctness" score={geminiEval.correctness} />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 italic leading-snug">
                    {geminiEval.commentary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
