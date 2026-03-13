import fs from "fs/promises";
import path from "path";
import type { MetricsStore } from "./store";
import type { MetricRecord, ModelStats } from "./schemas";
import { aggregateByModel } from "./aggregate";

const DATA_PATH = path.join(process.cwd(), ".data", "metrics.json");

export class JsonMetricsStore implements MetricsStore {
  private cache: MetricRecord[] | null = null;

  private async read(): Promise<MetricRecord[]> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(DATA_PATH, "utf-8");
      this.cache = JSON.parse(raw);
      return this.cache!;
    } catch {
      this.cache = [];
      return [];
    }
  }

  private async write(records: MetricRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(records, null, 2));
    this.cache = records;
  }

  async save(record: MetricRecord): Promise<void> {
    const records = await this.read();
    records.push(record);
    await this.write(records);
  }

  async getAll(modelId?: string): Promise<MetricRecord[]> {
    const records = await this.read();
    return modelId ? records.filter((r) => r.modelId === modelId) : records;
  }

  async getAggregatedStats(): Promise<ModelStats[]> {
    const records = await this.read();
    return aggregateByModel(records);
  }
}
