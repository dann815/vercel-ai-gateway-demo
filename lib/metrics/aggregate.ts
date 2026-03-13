import type { MetricRecord, ModelStats } from "./schemas";

function avg(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function aggregateByModel(records: MetricRecord[]): ModelStats[] {
  const grouped = new Map<string, MetricRecord[]>();

  for (const record of records) {
    const existing = grouped.get(record.modelId);
    if (existing) {
      existing.push(record);
    } else {
      grouped.set(record.modelId, [record]);
    }
  }

  const stats: ModelStats[] = [];

  for (const [modelId, recs] of grouped) {
    const ttfts = recs.map((r) => r.ttftMs).filter((v): v is number => v != null);
    const streamingTimes = recs.map((r) => r.streamingMs).filter((v): v is number => v != null);
    const inputTokens = recs.map((r) => r.inputTokens).filter((v): v is number => v != null);
    const outputTokens = recs.map((r) => r.outputTokens).filter((v): v is number => v != null);
    const costs = recs.map((r) => r.estimatedCost).filter((v): v is number => v != null);

    const tokensPerSecond = recs
      .filter((r) => r.outputTokens != null && r.streamingMs != null && r.streamingMs > 0)
      .map((r) => r.outputTokens! / (r.streamingMs! / 1000));

    let simple = 0;
    let moderate = 0;
    let complex = 0;
    for (const r of recs) {
      if (r.complexity === "simple") simple++;
      else if (r.complexity === "moderate") moderate++;
      else if (r.complexity === "complex") complex++;
    }

    stats.push({
      modelId,
      requestCount: recs.length,
      avgTtftMs: avg(ttfts),
      avgStreamingMs: avg(streamingTimes),
      avgInputTokens: avg(inputTokens),
      avgOutputTokens: avg(outputTokens),
      avgCost: avg(costs),
      totalCost: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : undefined,
      avgTokensPerSecond: avg(tokensPerSecond),
      complexityBreakdown: { simple, moderate, complex },
    });
  }

  return stats.sort((a, b) => b.requestCount - a.requestCount);
}
