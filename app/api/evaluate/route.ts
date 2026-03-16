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

function buildPrompt(userPrompt: string, responsesBlock: string) {
  return `You are an expert evaluator comparing AI model outputs. Score each response on three dimensions using a 1-10 scale.

**Scoring Dimensions:**

1. **Verbosity** (1 = extremely terse/missing info, 5 = appropriately detailed, 10 = excessively verbose/padded)
   - A score of 5 is ideal. Scores far above or below 5 indicate the response is too long or too short for the question.

2. **Reading Level** (1 = requires expert domain knowledge, 5 = clear to a general audience, 10 = oversimplified/condescending)
   - A score of 5 is ideal for most questions. Adjust based on the question's inherent complexity.

3. **Correctness** (1 = mostly wrong or misleading, 5 = partially correct with notable gaps, 10 = fully accurate and complete)
   - Higher is always better for correctness.

**User Prompt:**
"${userPrompt}"

${responsesBlock}

Respond with ONLY a JSON object (no markdown, no code fences) in this exact format:
{"evaluations": [{"label": "A", "verbosity": 5, "readingLevel": 5, "correctness": 8, "commentary": "brief 1-2 sentence justification"}]}

Include one entry per response, in order (A, B, C, ...).`;
}

type EvalResult = {
  modelId: string;
  verbosity: number;
  readingLevel: number;
  correctness: number;
  commentary: string;
};

async function runEval(
  evalModelId: string,
  prompt: string,
  responses: { modelId: string; text: string }[],
  responsesBlock: string
): Promise<EvalResult[] | null> {
  try {
    const { text } = await generateText({
      model: gateway(evalModelId),
      prompt: buildPrompt(prompt, responsesBlock),
    });

    const cleaned = text
      .replace(/```(?:json)?\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const result = evaluationSchema.parse(JSON.parse(cleaned));

    return result.evaluations.map((ev, i) => ({
      modelId: responses[i]?.modelId ?? ev.label,
      verbosity: ev.verbosity,
      readingLevel: ev.readingLevel,
      correctness: ev.correctness,
      commentary: ev.commentary,
    }));
  } catch (e) {
    console.error(`Evaluation failed for ${evalModelId}:`, e);
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { prompt, responses } = parsed.data;

  const labels = responses.map((_, i) => String.fromCharCode(65 + i));
  const responsesBlock = responses
    .map((r, i) => `=== Response ${labels[i]} ===\n${r.text}`)
    .join("\n\n");

  // Run both evaluations in parallel
  const [llamaEvals, geminiEvals] = await Promise.all([
    runEval("meta/llama-3.1-8b", prompt, responses, responsesBlock),
    runEval("google/gemini-3-flash", prompt, responses, responsesBlock),
  ]);

  return Response.json({
    llama: llamaEvals ? { evaluations: llamaEvals } : null,
    gemini: geminiEvals ? { evaluations: geminiEvals } : null,
  });
}
