import { JsonMetricsStore } from "./json-store";

export const metricsStore = new JsonMetricsStore();
export { aggregateByModel } from "./aggregate";
export * from "./schemas";
export type { MetricsStore } from "./store";
