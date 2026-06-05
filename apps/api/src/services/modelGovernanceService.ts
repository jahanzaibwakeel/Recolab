import { pool, query } from "../db/pool.js";
import { invalidateAllRecommendationCache } from "./cache.js";

export async function modelGovernanceReport() {
  const result = await query(`
    SELECT
      mv.version,
      mv.status,
      mv.approval_status,
      mv.algorithm_weights,
      mv.metrics,
      mv.artifact_path,
      mv.governance_notes,
      mv.rejection_reason,
      mv.created_at,
      mv.activated_at,
      mv.approved_at,
      mv.rejected_at,
      approver.name AS approved_by_name,
      rejector.name AS rejected_by_name
    FROM model_versions mv
    LEFT JOIN users approver ON approver.id = mv.approved_by
    LEFT JOIN users rejector ON rejector.id = mv.rejected_by
    ORDER BY mv.created_at DESC
    LIMIT 30
  `);

  const summary = result.rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.approval_status as "pending" | "approved" | "rejected"] += 1;
      if (row.status === "active") acc.active += 1;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, active: 0 }
  );

  return { summary, versions: result.rows };
}

export async function approveModelVersion(version: string, actorId: string, notes?: string) {
  const result = await query(
    `UPDATE model_versions
     SET approval_status = 'approved',
         approved_by = $2,
         approved_at = now(),
         rejected_by = NULL,
         rejected_at = NULL,
         rejection_reason = NULL,
         governance_notes = COALESCE(NULLIF($3, ''), governance_notes)
     WHERE version = $1 AND approval_status <> 'rejected'
     RETURNING *`,
    [version, actorId, notes ?? ""]
  );
  if (!result.rows[0]) throw new Error("Model version not found or rejected");
  return result.rows[0];
}

export async function rejectModelVersion(version: string, actorId: string, reason?: string) {
  const result = await query(
    `UPDATE model_versions
     SET approval_status = 'rejected',
         status = CASE WHEN status = 'active' THEN status ELSE 'failed' END,
         rejected_by = $2,
         rejected_at = now(),
         rejection_reason = COALESCE(NULLIF($3, ''), 'Rejected during governance review')
     WHERE version = $1 AND status <> 'active'
     RETURNING *`,
    [version, actorId, reason ?? ""]
  );
  if (!result.rows[0]) throw new Error("Model version not found or already active");
  return result.rows[0];
}

export async function activateModelVersion(version: string, actorId: string, notes?: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const candidate = await client.query(
      "SELECT version, approval_status FROM model_versions WHERE version = $1 FOR UPDATE",
      [version]
    );
    if (!candidate.rows[0]) throw new Error("Model version not found");

    await client.query(
      `UPDATE model_versions
       SET approval_status = 'approved',
           approved_by = COALESCE(approved_by, $2),
           approved_at = COALESCE(approved_at, now()),
           governance_notes = COALESCE(NULLIF($3, ''), governance_notes)
       WHERE version = $1`,
      [version, actorId, notes ?? ""]
    );
    await client.query("UPDATE model_versions SET status = 'archived' WHERE status = 'active' AND version <> $1", [version]);
    const activated = await client.query(
      `UPDATE model_versions
       SET status = 'active',
           activated_at = now()
       WHERE version = $1
       RETURNING *`,
      [version]
    );
    await client.query("COMMIT");
    await invalidateAllRecommendationCache();
    return activated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
