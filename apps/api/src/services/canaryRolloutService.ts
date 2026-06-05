import { randomUUID, createHash } from "node:crypto";
import { query } from "../db/pool.js";
import { activeModelVersion } from "./repository.js";

type CanaryStatus = "draft" | "running" | "paused" | "rolled_back" | "promoted";

function assignmentBucket(userId: string, version: string) {
  const hex = createHash("sha256").update(`${userId}:${version}`).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) % 10000 / 100;
}

function metricAverage(metrics: unknown, key: string) {
  if (!Array.isArray(metrics)) return 0;
  const values = metrics.map((row: any) => Number(row?.[key] ?? 0)).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function recommendation(trafficPercent: number, ndcgDelta: number, precisionDelta: number) {
  if (trafficPercent === 0) return "start canary";
  if (ndcgDelta < -0.02 || precisionDelta < -0.02) return "rollback";
  if (trafficPercent < 50 && ndcgDelta >= -0.01) return "expand";
  if (trafficPercent >= 50 && ndcgDelta >= 0) return "promote";
  return "hold";
}

export async function canaryRolloutReport() {
  const [rollouts, users, active] = await Promise.all([
    query<any>(`
      SELECT
        mcr.*,
        creator.name AS created_by_name,
        candidate.metrics AS candidate_metrics,
        candidate.status AS candidate_status,
        candidate.approval_status AS candidate_approval_status,
        baseline.metrics AS baseline_metrics
      FROM model_canary_rollouts mcr
      JOIN model_versions candidate ON candidate.version = mcr.candidate_version
      LEFT JOIN model_versions baseline ON baseline.version = mcr.baseline_version
      LEFT JOIN users creator ON creator.id = mcr.created_by
      ORDER BY mcr.created_at DESC
      LIMIT 20
    `),
    query("SELECT id FROM users WHERE data_deleted_at IS NULL ORDER BY id"),
    activeModelVersion()
  ]);

  const rows = rollouts.rows.map((row) => {
    const assignedUsers = users.rows.filter((user) => assignmentBucket(user.id, row.candidate_version) < Number(row.traffic_percent)).length;
    const candidateNdcg = metricAverage(row.candidate_metrics, "ndcgAtK");
    const baselineNdcg = metricAverage(row.baseline_metrics, "ndcgAtK");
    const candidatePrecision = metricAverage(row.candidate_metrics, "precisionAtK");
    const baselinePrecision = metricAverage(row.baseline_metrics, "precisionAtK");
    const ndcgDelta = candidateNdcg - baselineNdcg;
    const precisionDelta = candidatePrecision - baselinePrecision;
    return {
      ...row,
      traffic_percent: Number(row.traffic_percent),
      assignedUsers,
      totalEligibleUsers: users.rows.length,
      simulation: {
        candidateNdcg,
        baselineNdcg,
        ndcgDelta,
        candidatePrecision,
        baselinePrecision,
        precisionDelta,
        recommendation: recommendation(Number(row.traffic_percent), ndcgDelta, precisionDelta)
      }
    };
  });

  return {
    activeModelVersion: active,
    summary: {
      total: rows.length,
      running: rows.filter((row) => row.status === "running").length,
      paused: rows.filter((row) => row.status === "paused").length,
      promoted: rows.filter((row) => row.status === "promoted").length
    },
    rollouts: rows
  };
}

export async function createCanaryRollout(candidateVersion: string, trafficPercent: number, actorId: string, notes?: string) {
  const active = await activeModelVersion();
  const candidate = await query("SELECT version, approval_status FROM model_versions WHERE version = $1", [candidateVersion]);
  if (!candidate.rows[0]) throw new Error("Candidate model version not found");
  if (candidate.rows[0].approval_status !== "approved") throw new Error("Canary candidate must be approved first");
  const result = await query(
    `INSERT INTO model_canary_rollouts(id, candidate_version, baseline_version, traffic_percent, status, guardrail_metrics, notes, created_by)
     VALUES ($1, $2, $3, $4, 'running', $5, $6, $7)
     RETURNING *`,
    [
      randomUUID(),
      candidateVersion,
      active,
      trafficPercent,
      { minNdcgDelta: -0.02, minPrecisionDelta: -0.02 },
      notes ?? "Initial canary rollout",
      actorId
    ]
  );
  return result.rows[0];
}

export async function updateCanaryRollout(id: string, action: "expand" | "pause" | "rollback" | "promote" | "enable_live" | "disable_live", trafficPercent?: number) {
  const status: Record<"expand" | "pause" | "rollback" | "promote" | "enable_live" | "disable_live", CanaryStatus> = {
    expand: "running",
    pause: "paused",
    rollback: "rolled_back",
    promote: "promoted",
    enable_live: "running",
    disable_live: "running"
  };
  const nextTraffic = action === "expand" ? Math.min(Math.max(Number(trafficPercent ?? 25), 1), 100) : undefined;
  const result = await query(
    `UPDATE model_canary_rollouts
     SET status = $2,
         traffic_percent = COALESCE($3, traffic_percent),
         live_routing_enabled = CASE
           WHEN $4 = 'enable_live' THEN true
           WHEN $4 = 'disable_live' THEN false
           ELSE live_routing_enabled
         END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status[action], nextTraffic, action]
  );
  if (!result.rows[0]) throw new Error("Canary rollout not found");
  return result.rows[0];
}

export async function resolveCanaryServingModel(userId: string) {
  const active = await activeModelVersion();
  const rollouts = await query<any>(
    `SELECT candidate_version, traffic_percent
     FROM model_canary_rollouts
     WHERE status = 'running' AND live_routing_enabled = true
     ORDER BY updated_at DESC
     LIMIT 5`
  );
  for (const rollout of rollouts.rows) {
    if (assignmentBucket(userId, rollout.candidate_version) < Number(rollout.traffic_percent)) {
      return {
        modelVersion: rollout.candidate_version,
        routing: {
          mode: "canary",
          baselineVersion: active,
          trafficPercent: Number(rollout.traffic_percent)
        }
      };
    }
  }
  return { modelVersion: active, routing: { mode: "active", baselineVersion: active, trafficPercent: 100 } };
}
