import { z } from "zod";

export const metricRecordSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  modelId: z.string(),
  complexity: z.enum(["simple", "moderate", "complex"]).optional(),
  justification: z.string().optional(),
  classificationMs: z.number().optional(),
  ttftMs: z.number().optional(),
  streamingMs: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  estimatedCost: z.number().optional(),
});

export type MetricRecord = z.infer<typeof metricRecordSchema>;

export const modelStatsSchema = z.object({
  modelId: z.string(),
  requestCount: z.number(),
  avgTtftMs: z.number().optional(),
  avgStreamingMs: z.number().optional(),
  avgInputTokens: z.number().optional(),
  avgOutputTokens: z.number().optional(),
  avgCost: z.number().optional(),
  totalCost: z.number().optional(),
  avgTokensPerSecond: z.number().optional(),
  complexityBreakdown: z.object({
    simple: z.number(),
    moderate: z.number(),
    complex: z.number(),
  }),
});

export type ModelStats = z.infer<typeof modelStatsSchema>;
