"use client";

import { ArchitectureDiagram } from "@/components/architecture-diagram";

const DIAGRAM = `
flowchart TB
  User([User submits prompt])

  subgraph Parallel["Parallel Streaming — Promise.all()"]
    direction LR
    A["Model A\\n<i>e.g. gpt-5-nano</i>"]
    B["Model B\\n<i>e.g. claude-haiku-4.5</i>"]
    C["Model C\\n<i>e.g. gemini-3-flash</i>"]
    D["Model ...N"]
  end

  subgraph Metrics["Per-Model Metrics Collected"]
    direction LR
    M1["TTFT"]
    M2["Streaming time"]
    M3["Token counts"]
    M4["Cost estimate"]
    M5["Complexity"]
  end

  subgraph Eval["Evaluation Phase"]
    direction TB
    Anon["Anonymize outputs\\n<i>Response A, B, C…</i>"]
    Judge["Evaluator Model\\n<i>claude-haiku-4.5</i>"]
    Scores["Score each on:\\n• Verbosity 1-10\\n• Reading Level 1-10\\n• Correctness 1-10"]
    Commentary["Per-model commentary"]
  end

  Display["Side-by-side columns\\nwith scores + metadata"]

  User --> Parallel
  A --> Metrics
  B --> Metrics
  C --> Metrics
  D --> Metrics
  Metrics --> Eval
  Anon --> Judge --> Scores --> Commentary
  Eval --> Display

  style Parallel fill:#1e293b,stroke:#334155,color:#e2e8f0
  style Metrics fill:#0c4a6e,stroke:#0369a1,color:#e0f2fe
  style Eval fill:#312e81,stroke:#4338ca,color:#e0e7ff
  style User fill:#065f46,stroke:#059669,color:#d1fae5
  style Display fill:#065f46,stroke:#059669,color:#d1fae5
`;

export default function ArchitecturePage() {
  return (
    <ArchitectureDiagram
      diagram={DIAGRAM}
      title="HOW EVALUATION WORKS"
      backHref="/compare"
      description={
        <>
          <p>
            Each model streams its response through the existing{" "}
            <code className="text-xs px-1.5 py-0.5 rounded bg-muted font-mono">
              /api/chat
            </code>{" "}
            endpoint in parallel.
          </p>
          <p>
            Once all streams complete, outputs are anonymized and sent to an
            evaluator model which scores each on verbosity, reading level, and
            correctness.
          </p>
        </>
      }
    />
  );
}
