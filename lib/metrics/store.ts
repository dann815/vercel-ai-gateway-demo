import type { MetricRecord, ModelStats } from "./schemas";

export interface MetricsStore {
  save(record: MetricRecord): Promise<void>;
  getAll(modelId?: string): Promise<MetricRecord[]>;
  getAggregatedStats(): Promise<ModelStats[]>;
}
