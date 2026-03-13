import { z } from "zod";

export const messageMetadataSchema = z.object({
  complexity: z.enum(["simple", "moderate", "complex"]).optional(),
  justification: z.string().optional(),
  modelId: z.string().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  classificationMs: z.number().optional(),
  ttftMs: z.number().optional(),
  streamingMs: z.number().optional(),
  estimatedCost: z.number().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
