import { createHash } from "node:crypto";
import { query } from "../db/pool.js";

export async function activeTracePolicy() {
  const result = await query("SELECT * FROM trace_retention_policies WHERE is_active = true ORDER BY updated_at DESC LIMIT 1");
  return result.rows[0] ?? { name: "default-local-policy", sample_rate: 0.25, retention_days: 30, export_format: "both", storage_mode: "download_only", include_feature_values: true };
}

function deterministicSample(userId: string, itemId: string, algorithm: string, sampleRate: number) {
  const hex = createHash("sha256").update(`${userId}:${itemId}:${algorithm}`).digest("hex").slice(0, 8);
  const bucket = Number.parseInt(hex, 16) % 10000 / 10000;
  return bucket < sampleRate;
}

export async function recordTraceAccess(userId: string, itemId: string, algorithm: string, eventType: "view" | "export_json" | "export_html", metadata: Record<string, unknown> = {}) {
  const policy = await activeTracePolicy();
  const sampleRate = Number(policy.sample_rate ?? 0.25);
  const sampled = deterministicSample(userId, itemId, algorithm, sampleRate);
  await query(
    `INSERT INTO sampled_trace_events(user_id, item_id, algorithm, event_type, sampled, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, itemId, algorithm, eventType, sampled, metadata]
  );
  return { sampled, sampleRate };
}

export async function traceRetentionReport() {
  const [policy, traces, explanations, recommendations] = await Promise.all([
    activeTracePolicy(),
    query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE sampled)::int AS sampled,
        min(created_at) AS oldest,
        max(created_at) AS newest
      FROM sampled_trace_events
    `),
    query("SELECT count(*)::int AS total, min(created_at) AS oldest FROM explanation_logs"),
    query("SELECT count(*)::int AS total, min(created_at) AS oldest FROM recommendation_results")
  ]);
  return {
    policy,
    exportPolicy: {
      allowedFormats: policy.export_format === "both" ? ["json", "html"] : [policy.export_format],
      storageMode: policy.storage_mode,
      includeFeatureValues: policy.include_feature_values
    },
    sampledTraceEvents: traces.rows[0],
    explanationLogs: explanations.rows[0],
    recommendationResults: recommendations.rows[0]
  };
}

export async function updateTraceRetentionPolicy(sampleRate: number, retentionDays: number, exportFormat = "both", storageMode = "download_only", includeFeatureValues = true) {
  await query("UPDATE trace_retention_policies SET is_active = false");
  const result = await query(
    `INSERT INTO trace_retention_policies(name, sample_rate, retention_days, export_format, storage_mode, include_feature_values, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     ON CONFLICT (name) DO UPDATE SET
       sample_rate = EXCLUDED.sample_rate,
       retention_days = EXCLUDED.retention_days,
       export_format = EXCLUDED.export_format,
       storage_mode = EXCLUDED.storage_mode,
       include_feature_values = EXCLUDED.include_feature_values,
       is_active = true,
       updated_at = now()
     RETURNING *`,
    [`local-policy-${retentionDays}d-${Math.round(sampleRate * 100)}pct-${exportFormat}-${storageMode}`, sampleRate, retentionDays, exportFormat, storageMode, includeFeatureValues]
  );
  return result.rows[0];
}

export async function assertTraceExportAllowed(format: "json" | "html") {
  const policy = await activeTracePolicy();
  if (policy.export_format !== "both" && policy.export_format !== format) {
    throw Object.assign(new Error(`Trace ${format} export is disabled by active policy`), { statusCode: 403 });
  }
  return policy;
}

export async function runTraceRetentionCleanup() {
  const policy = await activeTracePolicy();
  const retentionDays = Number(policy.retention_days ?? 30);
  const [traceEvents, explanations, recommendations] = await Promise.all([
    query("DELETE FROM sampled_trace_events WHERE created_at < now() - ($1::int * interval '1 day') RETURNING id", [retentionDays]),
    query("DELETE FROM explanation_logs WHERE created_at < now() - ($1::int * interval '1 day') RETURNING id", [retentionDays]),
    query("DELETE FROM recommendation_results WHERE created_at < now() - ($1::int * interval '1 day') RETURNING id", [retentionDays])
  ]);
  return {
    retentionDays,
    deletedTraceEvents: traceEvents.rowCount,
    deletedExplanationLogs: explanations.rowCount,
    deletedRecommendationResults: recommendations.rowCount
  };
}
