import { query } from "../db/pool.js";
import { metricsSnapshot } from "../observability/metrics.js";

export async function persistObservabilitySnapshot() {
  const snapshot = metricsSnapshot();
  await query(
    `INSERT INTO observability_snapshots(timers, counters, derived, uptime_seconds)
     VALUES ($1, $2, $3, $4)`,
    [snapshot.timers, snapshot.counters, snapshot.derived, snapshot.uptimeSeconds]
  );
  return snapshot;
}

export async function observabilityHistory(limit = 60) {
  const boundedLimit = Math.max(1, Math.min(240, Math.floor(limit)));
  const result = await query(
    `SELECT id, captured_at, timers, counters, derived, uptime_seconds
     FROM observability_snapshots
     ORDER BY captured_at DESC
     LIMIT $1`,
    [boundedLimit]
  );
  return result.rows.reverse().map((row) => ({
    id: row.id,
    capturedAt: row.captured_at,
    timers: row.timers ?? {},
    counters: row.counters ?? {},
    derived: row.derived ?? {},
    uptimeSeconds: Number(row.uptime_seconds ?? 0)
  }));
}

export function startObservabilitySnapshotLoop(intervalMs = 60_000) {
  persistObservabilitySnapshot().catch((error) => {
    console.warn("Initial observability snapshot failed", error);
  });
  const timer = setInterval(() => {
    persistObservabilitySnapshot().catch((error) => {
      console.warn("Observability snapshot failed", error);
    });
  }, intervalMs);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
  return timer;
}
