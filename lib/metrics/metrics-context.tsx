"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import type { MetricRecord, ModelStats } from "./schemas";
import { aggregateByModel } from "./aggregate";

const STORAGE_KEY = "ai-gateway-metrics";

type MetricsContextValue = {
  records: MetricRecord[];
  stats: ModelStats[];
  globalStats: ModelStats[];
  addRecord: (record: MetricRecord) => void;
  refreshGlobalStats: () => Promise<void>;
};

const MetricsContext = createContext<MetricsContextValue>({
  records: [],
  stats: [],
  globalStats: [],
  addRecord: () => {},
  refreshGlobalStats: async () => {},
});

function loadFromStorage(): MetricRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<MetricRecord[]>(loadFromStorage);
  const [globalStats, setGlobalStats] = useState<ModelStats[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const addRecord = useCallback((record: MetricRecord) => {
    setRecords((prev) => [...prev, record]);
    fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    }).catch(console.error);
  }, []);

  const stats = useMemo(() => aggregateByModel(records), [records]);

  const refreshGlobalStats = useCallback(async () => {
    const res = await fetch("/api/metrics");
    const data = await res.json();
    setGlobalStats(data.stats);
  }, []);

  const value = useMemo(
    () => ({ records, stats, globalStats, addRecord, refreshGlobalStats }),
    [records, stats, globalStats, addRecord, refreshGlobalStats],
  );

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
}

export const useMetrics = () => useContext(MetricsContext);
