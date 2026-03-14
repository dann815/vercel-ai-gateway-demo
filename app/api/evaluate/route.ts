import { generateText } from "ai";
import { gateway } from "@/lib/gateway";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string(),
  responses: z.array(
    z.object({
      modelId: z.string(),
      text: z.string(),
    })
  ),
});

const evaluationSchema = z.object({
  evaluations: z.array(
    z.object({
      label: z.string(),
      verbosity: z.number().min(1).max(10),
      readingLevel: z.number().min(1).max(10),
      correctness: z.number().min(1).max(10),
      commentary: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { prompt, responses } = parsed.data;

  // Assign anonymous labels to avoid model-name bias
  const labels = responses.map((_, i) => String.fromCharCode(65 + i)); // A, B, C, ...

  const responsesBlock = responses
    .map(
      (r, i) =>
        `=== Response ${labels[i]} ===\n${r.text}`
    )
    .join("\n\n");

  const { text } = await generateText({
    model: gateway("anthropic/claude-haiku-4.5"),
    prompt: `You are an expert evaluator comparing AI model outputs. Score each response on three dimensions using a 1-10 scale.

**Scoring Dimensions:**

1. **Verbosity** (1 = extremely terse/missing info, 5 = appropriately detailed, 10 = excessively verbose/padded)
   - A score of 5 is ideal. Scores far above or below 5 indicate the response is too long or too short for the question.

2. **Reading Level** (1 = requires expert domain knowledge, 5 = clear to a general audience, 10 = oversimplified/condescending)
   - A score of 5 is ideal for most questions. Adjust based on the question's inherent complexity.

3. **Correctness** (1 = mostly wrong or misleading, 5 = partially correct with notable gaps, 10 = fully accurate and complete)
   - Higher is always better for correctness.

**User Prompt:**
"${prompt}"

${responsesBlock}

Respond with ONLY a JSON object (no markdown, no code fences) in this exact format:
{"evaluations": [{"label": "A", "verbosity": 5, "readingLevel": 5, "correctness": 8, "commentary": "brief 1-2 sentence justification"}]}

Include one entry per response, in order (A, B, C, ...).`,
  });

  try {
    const cleaned = text
      .replace(/```(?:json)?\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const result = evaluationSchema.parse(JSON.parse(cleaned));

    // Map labels back to modelIds
    const evaluations = result.evaluations.map((ev, i) => ({
      modelId: responses[i]?.modelId ?? ev.label,
      verbosity: ev.verbosity,
      readingLevel: ev.readingLevel,
      correctness: ev.correctness,
      commentary: ev.commentary,
    }));

    return Response.json({ evaluations });
  } catch (e) {
    console.error("Failed to parse evaluation:", e, text);
    return Response.json(
      { error: "Failed to parse evaluation response" },
      { status: 500 }
    );
  }
}
