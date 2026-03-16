"use client";

import { useState, useCallback, useRef } from "react";
import { useAvailableModels } from "@/lib/hooks/use-available-models";
import { SUGGESTED_PROMPTS } from "@/lib/constants";
import { ModelColumn, type EvaluationResult } from "@/components/model-column";
import { CompareTable } from "@/components/compare-table";
import { ThemeToggle } from "@/components/theme-toggle";
import { Leaderboard } from "@/components/leaderboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MessageMetadata } from "@/lib/message-metadata";
import {
  SendIcon,
  ArrowLeft,
  Loader2,
  FlaskConical,
  Check,
  Square,
  GitGraph,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type CompletedResponse = {
  modelId: string;
  text: string;
  metadata: MessageMetadata;
};

export function CompareView() {
  const { models, isLoading: modelsLoading } = useAvailableModels();
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string> | null>(
    null
  );
  const [input, setInput] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [roundId, setRoundId] = useState(0);
  const [llamaEvals, setLlamaEvals] = useState<
    Record<string, EvaluationResult>
  >({});
  const [geminiEvals, setGeminiEvals] = useState<
    Record<string, EvaluationResult>
  >({});
  const [evalStatus, setEvalStatus] = useState<
    "idle" | "running" | "complete" | "error"
  >("idle");

  const [completedMetadata, setCompletedMetadata] = useState<
    Record<string, MessageMetadata>
  >({});

  const statusesRef = useRef<Map<string, string>>(new Map());
  const completedRef = useRef<Map<string, CompletedResponse>>(new Map());
  const activeModelsRef = useRef<string[]>([]);

  // Default: all available models selected
  const effectiveSelected =
    selectedModelIds ?? new Set(models.map((m) => m.id));

  const toggleModel = (id: string) => {
    const next = new Set(effectiveSelected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedModelIds(next);
  };

  const runEvaluation = useCallback(
    async (responses: CompletedResponse[], prompt: string) => {
      setEvalStatus("running");
      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            responses: responses.map((r) => ({
              modelId: r.modelId,
              text: r.text,
            })),
          }),
        });
        if (!res.ok) throw new Error("Evaluation failed");
        const data = await res.json();

        if (data.llama?.evaluations) {
          const evMap: Record<string, EvaluationResult> = {};
          for (const ev of data.llama.evaluations) {
            evMap[ev.modelId] = ev;
          }
          setLlamaEvals(evMap);
        }
        if (data.gemini?.evaluations) {
          const evMap: Record<string, EvaluationResult> = {};
          for (const ev of data.gemini.evaluations) {
            evMap[ev.modelId] = ev;
          }
          setGeminiEvals(evMap);
        }
        setEvalStatus("complete");
      } catch (e) {
        console.error("Evaluation error:", e);
        setEvalStatus("error");
      }
    },
    []
  );

  const handleStatusChange = useCallback(
    (modelId: string, status: string) => {
      statusesRef.current.set(modelId, status);
    },
    []
  );

  const handleMetadataUpdate = useCallback(
    (modelId: string, metadata: MessageMetadata) => {
      setCompletedMetadata((prev) => ({ ...prev, [modelId]: metadata }));
    },
    []
  );

  const handleComplete = useCallback(
    (modelId: string, text: string, metadata: MessageMetadata) => {
      completedRef.current.set(modelId, { modelId, text, metadata });

      // Check if all models are done
      const allDone = activeModelsRef.current.every(
        (id) => completedRef.current.has(id)
      );
      if (allDone && activePrompt) {
        const responses = activeModelsRef.current
          .map((id) => completedRef.current.get(id)!)
          .filter((r) => r.text.length > 0);
        if (responses.length >= 2) {
          runEvaluation(responses, activePrompt);
        }
      }
    },
    [activePrompt, runEvaluation]
  );

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const modelIds = Array.from(effectiveSelected);
    if (modelIds.length === 0) return;

    // Reset state for new round
    statusesRef.current.clear();
    completedRef.current.clear();
    activeModelsRef.current = modelIds;
    setLlamaEvals({});
    setGeminiEvals({});
    setEvalStatus("idle");
    setCompletedMetadata({});
    setActivePrompt(text);
    setRoundId((r) => r + 1);
    setInput("");
  };

  const isRunning = activePrompt !== null && evalStatus !== "complete" && evalStatus !== "error";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex gap-2 animate-fade-in">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-9 w-9 shadow-border-small hover:shadow-border-medium bg-background/80 backdrop-blur-sm border-0 hover:bg-background hover:scale-[1.02] transition-all duration-150 ease"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <Leaderboard />
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-9 w-9 shadow-border-small hover:shadow-border-medium bg-background/80 backdrop-blur-sm border-0 hover:bg-background hover:scale-[1.02] transition-all duration-150 ease"
        >
          <Link href="/architecture">
            <GitGraph className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Evaluation status indicator */}
      {activePrompt && (
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10 animate-fade-in">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-border-small",
              evalStatus === "idle" && "bg-muted/60 text-muted-foreground",
              evalStatus === "running" &&
                "bg-blue-500/15 text-blue-700 dark:text-blue-400",
              evalStatus === "complete" &&
                "bg-green-500/15 text-green-700 dark:text-green-400",
              evalStatus === "error" &&
                "bg-red-500/15 text-red-700 dark:text-red-400"
            )}
          >
            {evalStatus === "idle" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Streaming...
              </>
            )}
            {evalStatus === "running" && (
              <>
                <FlaskConical className="h-3 w-3" />
                Evaluating...
              </>
            )}
            {evalStatus === "complete" && (
              <>
                <Check className="h-3 w-3" />
                Evaluated
              </>
            )}
            {evalStatus === "error" && "Evaluation failed"}
          </div>
        </div>
      )}

      {/* No active prompt - show landing */}
      {!activePrompt && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 animate-fade-in">
          <div className="w-full max-w-2xl text-center space-y-8 md:space-y-12">
            <h1 className="text-3xl md:text-6xl font-light tracking-tight text-foreground animate-slide-up">
              <span className="font-mono font-semibold tracking-tight bg-foreground text-background px-4 py-3 rounded-2xl shadow-border-medium">
                COMPARE
              </span>
            </h1>
            <p className="text-muted-foreground text-sm animate-fade-in" style={{ animationDelay: "100ms" }}>
              Send one prompt to all models simultaneously. Watch them stream
              side-by-side, then see how they score.
            </p>

            {/* Model toggles */}
            <div
              className="flex flex-wrap justify-center gap-2 animate-fade-in"
              style={{ animationDelay: "150ms" }}
            >
              {modelsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                models.map((m) => {
                  const selected = effectiveSelected.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModel(m.id)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all duration-150 shadow-border-small",
                        selected
                          ? "bg-foreground text-background font-medium"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      {selected ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Square className="h-3 w-3" />
                      )}
                      {m.id.split("/").pop()}
                    </button>
                  );
                })
              )}
            </div>

            {/* Suggested prompts */}
            <div
              className="flex flex-wrap justify-center gap-2 animate-fade-in"
              style={{ animationDelay: "200ms" }}
            >
              {SUGGESTED_PROMPTS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="text-sm px-3 py-1.5 rounded-full glass-effect shadow-border-small hover:shadow-border-medium transition-all duration-150 text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input */}
            <div
              className="w-full animate-slide-up"
              style={{ animationDelay: "250ms" }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
              >
                <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-2xl glass-effect shadow-border-medium transition-all duration-200 ease-out">
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap px-2">
                    {effectiveSelected.size} models
                  </span>
                  <div className="flex flex-1 items-center">
                    <Input
                      name="prompt"
                      placeholder="Ask a question..."
                      onChange={(e) => setInput(e.target.value)}
                      value={input}
                      autoFocus
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
                      onKeyDown={(e) => {
                        if (e.metaKey && e.key === "Enter") {
                          handleSend(input);
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl hover:bg-muted/50"
                      disabled={
                        !input.trim() || effectiveSelected.size === 0
                      }
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Active comparison */}
      {activePrompt && (
        <>
          {/* User prompt display */}
          <div className="pt-16 pb-3 px-4 md:px-8">
            <div className="bg-foreground text-background rounded-2xl p-3 md:p-4 max-w-2xl mx-auto shadow-border-small font-medium text-sm md:text-base">
              {activePrompt}
            </div>
          </div>

          {/* Columns */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-8 pb-4">
            <div className="flex gap-4 h-full">
              {activeModelsRef.current.map((id) => (
                <ModelColumn
                  key={`${roundId}-${id}`}
                  modelId={id}
                  prompt={activePrompt}
                  onStatusChange={handleStatusChange}
                  onComplete={handleComplete}
                  onMetadataUpdate={handleMetadataUpdate}
                  llamaEval={llamaEvals[id]}
                  geminiEval={geminiEvals[id]}
                />
              ))}
            </div>
          </div>

          {/* Summary table */}
          <CompareTable
            modelIds={activeModelsRef.current}
            completedMetadata={completedMetadata}
          />

          {/* Bottom input for follow-up */}
          <div className="w-full max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="px-4 md:px-8 pb-6 md:pb-8"
            >
              <div className="flex items-center gap-3 p-4 rounded-2xl glass-effect shadow-border-medium transition-all duration-200 ease-out">
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap px-2">
                  {effectiveSelected.size} models
                </span>
                <div className="flex flex-1 items-center">
                  <Input
                    name="prompt"
                    placeholder="Try another prompt..."
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60 font-medium"
                    disabled={isRunning}
                    onKeyDown={(e) => {
                      if (e.metaKey && e.key === "Enter") {
                        handleSend(input);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-xl hover:bg-accent hover:text-accent-foreground hover:scale-110 transition-all duration-150 ease disabled:opacity-50 disabled:hover:scale-100"
                    disabled={
                      !input.trim() ||
                      isRunning ||
                      effectiveSelected.size === 0
                    }
                  >
                    <SendIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
