type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const MODEL_PRICING: Record<string, ModelPricing> = {
  "amazon/nova-lite": { inputPerMillion: 0.06, outputPerMillion: 0.24 },
  "amazon/nova-micro": { inputPerMillion: 0.035, outputPerMillion: 0.14 },
  "anthropic/claude-haiku-4.5": { inputPerMillion: 0.8, outputPerMillion: 4.0 },
  "google/gemini-3-flash": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "google/gemma2-9b-it": { inputPerMillion: 0.2, outputPerMillion: 0.2 },
  "meta/llama-3.1-8b": { inputPerMillion: 0.05, outputPerMillion: 0.05 },
  "openai/gpt-5-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "openai/gpt-5-nano": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
};

export function calculateCost(
  modelId: string,
  usage: { promptTokens: number; completionTokens: number },
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;
  return (
    (usage.promptTokens / 1_000_000) * pricing.inputPerMillion +
    (usage.completionTokens / 1_000_000) * pricing.outputPerMillion
  );
}
