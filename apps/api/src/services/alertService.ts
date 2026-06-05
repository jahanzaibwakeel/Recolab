import { config } from "../config.js";
import { metricsSnapshot } from "../observability/metrics.js";
import { observabilityHistory } from "./observabilityHistoryService.js";

export type AlertSeverity = "ok" | "warning" | "critical";

export interface ObservabilityAlert {
  key: string;
  label: string;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  unit: "ms" | "rate";
  message: string;
  runbook: string[];
}

export async function observabilityAlerts() {
  const snapshot = metricsSnapshot();
  const history = await observabilityHistory(12);
  return evaluateAlertSnapshot(snapshot, history.length);
}

export function evaluateAlertSnapshot(snapshot: any, historyPoints = 0) {
  const alerts = [
    high("api_latency", "API latency", snapshot.timers.api?.avgMs ?? 0, config.alertApiAvgMs, "ms"),
    high("recommendation_latency", "Recommendation latency", snapshot.timers.recommendation?.avgMs ?? 0, config.alertRecommendationAvgMs, "ms"),
    high("ollama_latency", "Ollama explanation latency", snapshot.timers.ollama_explanation?.avgMs ?? 0, config.alertOllamaAvgMs, "ms"),
    low("cache_hit_rate", "Cache hit rate", snapshot.derived.cacheHitRate ?? 1, config.alertMinCacheHitRate, "rate"),
    high("llm_fallback_rate", "LLM fallback rate", snapshot.derived.explanationFallbackRate ?? 0, config.alertMaxExplanationFallbackRate, "rate"),
    high("embedding_fallback_rate", "Embedding fallback rate", snapshot.derived.embeddingFallbackRate ?? 0, config.alertMaxEmbeddingFallbackRate, "rate")
  ];
  const active = alerts.filter((alert) => alert.severity !== "ok");
  return {
    status: active.some((alert) => alert.severity === "critical") ? "critical" : active.length ? "warning" : "ok",
    generatedAt: new Date().toISOString(),
    historyPoints,
    alerts
  };
}

function high(key: string, label: string, value: number, threshold: number, unit: "ms" | "rate"): ObservabilityAlert {
  const ratio = threshold ? value / threshold : 0;
  const severity = ratio >= 1.5 ? "critical" : ratio > 1 ? "warning" : "ok";
  return row(key, label, severity, value, threshold, unit, `${label} should stay below ${format(threshold, unit)}.`);
}

function low(key: string, label: string, value: number, threshold: number, unit: "rate"): ObservabilityAlert {
  const severity = value < threshold * 0.5 ? "critical" : value < threshold ? "warning" : "ok";
  return row(key, label, severity, value, threshold, unit, `${label} should stay above ${format(threshold, unit)}.`);
}

function row(key: string, label: string, severity: AlertSeverity, value: number, threshold: number, unit: "ms" | "rate", message: string) {
  return { key, label, severity, value: Number(value.toFixed(4)), threshold, unit, message, runbook: runbookFor(key) };
}

function format(value: number, unit: "ms" | "rate") {
  return unit === "rate" ? `${Math.round(value * 100)}%` : `${value}ms`;
}

function runbookFor(key: string) {
  const runbooks: Record<string, string[]> = {
    api_latency: [
      "Check PostgreSQL and Valkey health before changing application code.",
      "Inspect slow API routes in observability history and compare against recent deploys.",
      "Reduce page payloads or add endpoint-level caching if latency persists."
    ],
    recommendation_latency: [
      "Check candidate generation size, semantic retrieval latency, and cache hit rate.",
      "Temporarily lower k or disable expensive experimental algorithms for the demo.",
      "Run batch scoring if online ranking work is repeatedly high."
    ],
    ollama_latency: [
      "Confirm the local Ollama model is pulled and warm.",
      "Use deterministic fallback explanations during demos if the model is cold.",
      "Shorten explanation prompts or switch to a smaller local model."
    ],
    cache_hit_rate: [
      "Confirm Valkey is reachable and cache keys are not being over-invalidated.",
      "Review recommendation request diversity by user, algorithm, and k.",
      "Increase cache TTL for stable demo data."
    ],
    llm_fallback_rate: [
      "Check Ollama health and model availability.",
      "Review explanation logs for failed prompts.",
      "Keep deterministic fallback enabled so ranking remains available."
    ],
    embedding_fallback_rate: [
      "Confirm the embedding model is pulled in Ollama.",
      "Rebuild embeddings from the admin dashboard or batch script.",
      "Use deterministic local embeddings until the optional semantic stack is ready."
    ]
  };
  return runbooks[key] ?? ["Inspect the metric, compare recent history, and use the local fallback path if needed."];
}
