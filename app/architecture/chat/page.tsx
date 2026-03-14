"use client";

import { ArchitectureDiagram } from "@/components/architecture-diagram";

const DIAGRAM = `
flowchart TB
  User([User sends message])

  subgraph API["POST /api/chat"]
    direction TB
    Validate["Validate modelId\\nagainst SUPPORTED_MODELS"]

    subgraph Classification["Complexity Classification"]
      direction LR
      ClassifyCall["generateText()\\n<i>same model</i>"]
      ClassifyResult["Rating: simple | moderate | complex\\n+ justification"]
    end

    subgraph Stream["streamText() — Main Response"]
      direction TB
      SystemPrompt["System prompt applied"]
      Chunks["Stream text chunks"]
      TTFT["Detect first chunk\\n→ TTFT measurement"]
    end
  end

  subgraph Metadata["Metadata Sent at Lifecycle Points"]
    direction LR
    Start["<b>start</b>\\nmodelId, complexity,\\njustification, classificationMs"]
    Delta["<b>text-delta</b>\\nttftMs"]
    Finish["<b>finish</b>\\ntokens, cost,\\nstreamingMs"]
  end

  subgraph Client["Client — useChat()"]
    direction TB
    Render["Render streamed markdown\\n<i>Streamdown</i>"]
    Meta["Display metadata pills\\n<i>MessageMeta</i>"]
    Persist["Persist to MetricsProvider\\n→ localStorage + /api/metrics"]
  end

  Leaderboard["Leaderboard aggregation"]

  User --> API
  Validate --> Classification
  ClassifyCall --> ClassifyResult
  Classification --> Stream
  SystemPrompt --> Chunks --> TTFT
  Stream --> Metadata
  Start --> Delta --> Finish
  Metadata --> Client
  Render --> Meta --> Persist
  Persist --> Leaderboard

  style API fill:#1e293b,stroke:#334155,color:#e2e8f0
  style Classification fill:#0c4a6e,stroke:#0369a1,color:#e0f2fe
  style Stream fill:#0c4a6e,stroke:#0369a1,color:#e0f2fe
  style Metadata fill:#312e81,stroke:#4338ca,color:#e0e7ff
  style Client fill:#065f46,stroke:#059669,color:#d1fae5
  style User fill:#065f46,stroke:#059669,color:#d1fae5
  style Leaderboard fill:#065f46,stroke:#059669,color:#d1fae5
`;

export default function ChatArchitecturePage() {
  return (
    <ArchitectureDiagram
      diagram={DIAGRAM}
      title="HOW CHAT WORKS"
      backHref="/"
      description={
        <>
          <p>
            The user selects a model and sends a message. The server classifies
            complexity, then streams the response via{" "}
            <code className="text-xs px-1.5 py-0.5 rounded bg-muted font-mono">
              streamText()
            </code>{" "}
            while measuring TTFT and token throughput.
          </p>
          <p>
            Metadata is sent at three lifecycle points — start, text-delta, and
            finish — and persisted to the leaderboard.
          </p>
        </>
      }
    />
  );
}
