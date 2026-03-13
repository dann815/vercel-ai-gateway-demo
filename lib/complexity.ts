import { generateObject } from "ai";
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
  const { object } = await generateObject({
    model,
    schema: complexitySchema,
    prompt: `Classify the complexity of this user message for an AI assistant. Consider factors like: number of sub-tasks, domain expertise required, reasoning depth needed.

Message: "${userMessage}"`,
  });

  return object;
}
