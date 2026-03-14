import { generateText } from "ai";
import { z } from "zod";
import type { LanguageModel } from "ai";

const complexitySchema = z.object({
  rating: z.enum(["simple", "moderate", "complex"]),
  justification: z.string(),
});

export type ComplexityRating = z.infer<typeof complexitySchema>;

export async function classifyComplexity(
  model: LanguageModel,
  userMessage: string,
): Promise<ComplexityRating> {
  const { text } = await generateText({
    model,
    prompt: `Classify the complexity of the following user message for an AI assistant.

Respond with ONLY a JSON object (no markdown, no code fences) in this exact format:
{"rating": "simple", "justification": "reason here"}

The rating must be one of: "simple", "moderate", "complex".
Consider factors like: number of sub-tasks, domain expertise required, reasoning depth needed.

User message: "${userMessage}"`,
  });

  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return complexitySchema.parse(parsed);
}
