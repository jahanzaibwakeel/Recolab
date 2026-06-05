import { performance } from "node:perf_hooks";

type TimerName =
  | "api"
  | "recommendation"
  | "ollama_explanation"
  | "ollama_embedding"
  | "qdrant_search"
  | "semantic_local_search";

interface TimerStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

interface CounterStats {
  count: number;
}

const timers = new Map<string, TimerStats>();
const counters = new Map<string, CounterStats>();
const startedAt = new Date();

export function incrementMetric(name: string, value = 1) {
  const current = counters.get(name) ?? { count: 0 };
  current.count += value;
  counters.set(name, current);
}

export function observeDuration(name: TimerName | string, durationMs: number) {
  const current = timers.get(name) ?? { count: 0, totalMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0 };
  current.count += 1;
  current.totalMs += durationMs;
  current.minMs = Math.min(current.minMs, durationMs);
  current.maxMs = Math.max(current.maxMs, durationMs);
  timers.set(name, current);
}

export async function timeAsync<T>(name: TimerName | string, fn: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await fn();
  } finally {
    observeDuration(name, performance.now() - started);
  }
}

export function metricsSnapshot() {
  const timerRows = Object.fromEntries(
    [...timers.entries()].map(([name, stat]) => [
      name,
      {
        count: stat.count,
        avgMs: round(stat.totalMs / Math.max(1, stat.count)),
        minMs: round(Number.isFinite(stat.minMs) ? stat.minMs : 0),
        maxMs: round(stat.maxMs)
      }
    ])
  );
  const counterRows = Object.fromEntries([...counters.entries()].map(([name, stat]) => [name, stat.count]));
  const cacheHits = counterRows["cache.hit"] ?? 0;
  const cacheMisses = counterRows["cache.miss"] ?? 0;
  const cacheTotal = cacheHits + cacheMisses;

  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    timers: timerRows,
    counters: counterRows,
    derived: {
      cacheHitRate: cacheTotal ? round(cacheHits / cacheTotal) : 0,
      explanationFallbackRate: ratio(counterRows["ollama.explanation.fallback"], counterRows["ollama.explanation.total"]),
      embeddingFallbackRate: ratio(counterRows["ollama.embedding.fallback"], counterRows["ollama.embedding.total"]),
      qdrantHitRate: ratio(counterRows["qdrant.hit"], (counterRows["qdrant.hit"] ?? 0) + (counterRows["qdrant.miss"] ?? 0))
    }
  };
}

function ratio(numerator: unknown, denominator: unknown) {
  const top = Number(numerator ?? 0);
  const bottom = Number(denominator ?? 0);
  return bottom ? round(top / bottom) : 0;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

