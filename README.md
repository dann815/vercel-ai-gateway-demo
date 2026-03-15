# Vercel AI Gateway Demo

A Next.js chatbot that demonstrates the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) with the [AI SDK](https://sdk.vercel.ai). Routes a single prompt through 8 models across 5 providers, streams responses with per-message observability, and compares model outputs side-by-side with AI-powered evaluation.

## Features

- **Multi-provider model routing** — one gateway, 8 models from Amazon, Anthropic, Google, Meta, and OpenAI
- **Streaming chat** with real-time metadata (time-to-first-token, token counts, estimated cost)
- **Side-by-side model comparison** — send the same prompt to multiple models in parallel
- **AI-powered evaluation** — an evaluator model scores responses on verbosity, reading level, and correctness
- **Server-side guardrails** — profanity filtering and complexity classification before the prompt reaches the model
- **Leaderboard** — session and global statistics ranked by TTFT, throughput, cost, and complexity breakdown

## Supported Models

| Provider  | Model               |
| --------- | ------------------- |
| Amazon    | Nova Lite           |
| Amazon    | Nova Micro          |
| Anthropic | Claude Haiku 4.5    |
| Google    | Gemini 3 Flash      |
| Google    | Gemma 2 9B IT       |
| Meta      | Llama 3.1 8B        |
| OpenAI    | GPT-5 Mini          |
| OpenAI    | GPT-5 Nano          |

## Routes

### Pages

| Route               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `/`                  | Single-model chat interface with model selector   |
| `/compare`           | Side-by-side multi-model comparison view          |
| `/architecture`      | Mermaid diagram of the evaluation flow            |
| `/architecture/chat` | Mermaid diagram of the chat flow                  |

### API

| Route            | Method   | Description                                                |
| ---------------- | -------- | ---------------------------------------------------------- |
| `/api/chat`      | POST     | Streams a chat response with metadata (see below)          |
| `/api/evaluate`  | POST     | Scores multiple model responses using an evaluator model   |
| `/api/metrics`   | GET/POST | Retrieves aggregated stats or persists a metrics record    |
| `/api/models`    | GET      | Lists available models from the gateway                    |

## How It Works

### AI Gateway

All model requests flow through the Vercel AI Gateway via a single provider instance:

```ts
import { createGatewayProvider } from "@ai-sdk/gateway";

export const gateway = createGatewayProvider({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
});
```

The gateway abstracts away provider-specific APIs. Calling `gateway("openai/gpt-5-nano")` or `gateway("anthropic/claude-haiku-4.5")` returns a `LanguageModel` that works with any AI SDK function.

### Chat Flow (`/api/chat`)

Each chat request passes through a multi-stage pipeline:

1. **Model validation** — reject unsupported model IDs
2. **Profanity filter** — server-side check using `bad-words` before the prompt reaches any model
3. **Complexity classification** — `generateText()` classifies the prompt as simple, moderate, or complex (with justification and latency tracking)
4. **Streaming response** — `streamText()` generates the response with an `onChunk` callback to measure time-to-first-token
5. **Metadata emission** — `toUIMessageStreamResponse()` sends metadata at three lifecycle points:
   - `start` — model ID, complexity rating, classification time
   - `text-delta` — TTFT (sent once)
   - `finish` — full token counts, estimated cost, streaming duration

### AI SDK Chat Hook

The client uses `useChat()` from `@ai-sdk/react` with a `messageMetadata` schema to type the streamed metadata:

```ts
const { messages, input, handleSubmit, setInput, status } = useChat({
  messageMetadata: messageMetadataSchema,
  body: { modelId },
});
```

This gives each assistant message typed metadata (TTFT, tokens, cost, complexity) that the UI renders as inline pills below the response.

### Compare Flow (`/compare`)

1. User selects models and submits a prompt
2. The prompt is sent **in parallel** to all selected models via `/api/chat`
3. Each model streams independently in its own column
4. When all models finish, responses are posted to `/api/evaluate`
5. The evaluator (Claude Haiku 4.5) anonymizes responses as A, B, C... to avoid model-name bias, then scores each on:
   - **Verbosity** (1-10, where 5 is ideal)
   - **Reading Level** (1-10, where 5 is ideal)
   - **Correctness** (1-10, higher is better)
6. Scores and commentary are displayed in each model's column

### Metrics & Leaderboard

Every response records: model ID, TTFT, streaming time, token counts, estimated cost, and complexity rating. Metrics are stored both client-side (localStorage) and server-side (JSON file), then aggregated into a sortable leaderboard.

## Customizing Prompts

Prompts are kept inline next to the logic that uses them. Here's where to find each one:

| Prompt | File | What it does |
| ------ | ---- | ------------ |
| Chat system prompt | `app/api/chat/route.ts:60` | Sets the assistant's persona for all chat responses |
| Complexity classification | `lib/complexity.ts:18` | Instructs the model to rate a user message as simple, moderate, or complex |
| Evaluation prompt | `app/api/evaluate/route.ts:50` | Tells the evaluator model how to score responses on verbosity, reading level, and correctness |

## Getting Started

### Prerequisites

- Node.js v24+
- A [Vercel](https://vercel.com) account with AI Gateway enabled

### Setup

```bash
npm install
```

### Development

```bash
vercel dev
```

### Deploy

```bash
vercel
vercel --prod
```

## Reference

- [AI SDK Documentation](https://sdk.vercel.ai)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
- [Internal observability dashboard](https://vercel.com/dann815s-projects/vercel-ai-gateway-demo/ai-gateway)
