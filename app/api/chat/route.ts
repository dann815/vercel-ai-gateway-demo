import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { DEFAULT_MODEL, SUPPORTED_MODELS } from "@/lib/constants";
import { gateway } from "@/lib/gateway";
import { classifyComplexity } from "@/lib/complexity";
import { calculateCost } from "@/lib/model-pricing";
import { containsProfanity } from "@/lib/profanity";
import type { MessageMetadata } from "@/lib/message-metadata";

export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    messages,
    modelId = DEFAULT_MODEL,
  }: { messages: UIMessage[]; modelId: string } = await req.json();

  // Only accept supported models
  if (!SUPPORTED_MODELS.includes(modelId)) {
    return new Response(
      JSON.stringify({ error: `Model ${modelId} is not supported` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const lastUserMessage = messages.filter((m) => m.role === "user").pop();
  const userText =
    lastUserMessage?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  if (containsProfanity(userText)) {
    return new Response(
      JSON.stringify({ error: "Message contains inappropriate language." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let complexity: MessageMetadata["complexity"];
  let justification: MessageMetadata["justification"];
  let classificationMs: number | undefined;

  const classificationStart = Date.now();
  await classifyComplexity(gateway(modelId), userText)
    .then((result) => {
      classificationMs = Date.now() - classificationStart;
      complexity = result.rating;
      justification = result.justification;
    })
    .catch((e) => {
      console.error("Complexity classification failed:", e);
    });

  const responseStart = Date.now();
  let ttftMs: number | undefined;
  let firstChunkTime: number | undefined;

  const result = streamText({
    model: gateway(modelId),
    system: "You are a software engineer exploring Generative AI.",
    messages: convertToModelMessages(messages),
    onChunk: () => {
      if (ttftMs === undefined) {
        firstChunkTime = Date.now();
        ttftMs = firstChunkTime - responseStart;
      }
    },
    onError: (e) => {
      console.error("Error while streaming.", e);
    },
  });

  let ttftSent = false;

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return {
          modelId,
          complexity,
          justification,
          classificationMs,
        } satisfies MessageMetadata;
      }
      if (part.type === "text-delta" && !ttftSent && ttftMs !== undefined) {
        ttftSent = true;
        return { ttftMs } satisfies MessageMetadata;
      }
      if (part.type === "finish") {
        const inputTokens = part.totalUsage.inputTokens ?? 0;
        const outputTokens = part.totalUsage.outputTokens ?? 0;
        return {
          modelId,
          complexity,
          justification,
          classificationMs,
          inputTokens,
          outputTokens,
          ttftMs,
          streamingMs: firstChunkTime ? Date.now() - firstChunkTime : undefined,
          estimatedCost: calculateCost(modelId, {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
          }),
        } satisfies MessageMetadata;
      }
    },
  });
}
