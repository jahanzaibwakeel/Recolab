import { createHash, randomUUID } from "node:crypto";
import { query } from "../db/pool.js";

export async function assignExperiment(userId: string, experimentKey = "hybrid-vs-semantic") {
  const experimentResult = await query("SELECT * FROM experiments WHERE key = $1 AND status = 'running'", [experimentKey]);
  const experiment = experimentResult.rows[0];
  if (!experiment) return null;

  const existing = await query(
    `SELECT user_experiment_assignments.*, experiment_variants.key AS variant_key, experiment_variants.algorithm
     FROM user_experiment_assignments
     JOIN experiment_variants ON experiment_variants.id = user_experiment_assignments.variant_id
     WHERE user_experiment_assignments.experiment_id = $1 AND user_experiment_assignments.user_id = $2`,
    [experiment.id, userId]
  );
  if (existing.rows[0]) return { experiment, assignment: existing.rows[0] };

  const variants = await query("SELECT * FROM experiment_variants WHERE experiment_id = $1 ORDER BY key", [experiment.id]);
  if (!variants.rows.length) return null;
  const bucket = deterministicBucket(`${experiment.key}:${userId}`);
  let cumulative = 0;
  let selected = variants.rows[0]!;
  for (const variant of variants.rows) {
    cumulative += Number(variant.traffic_percent);
    if (bucket < cumulative) {
      selected = variant;
      break;
    }
  }

  const assignment = await query(
    `INSERT INTO user_experiment_assignments(id, experiment_id, variant_id, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), experiment.id, selected.id, userId]
  );
  return { experiment, assignment: { ...assignment.rows[0], variant_key: selected.key, algorithm: selected.algorithm } };
}

export async function logExperimentEvent(userId: string, itemId: string | null, eventType: string, value = 1, experimentKey = "hybrid-vs-semantic") {
  const assigned = await assignExperiment(userId, experimentKey);
  if (!assigned) return null;
  await query(
    `INSERT INTO experiment_events(id, experiment_id, variant_id, user_id, item_id, event_type, value)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [randomUUID(), assigned.experiment.id, assigned.assignment.variant_id, userId, itemId, eventType, value]
  );
  return assigned;
}

export async function experimentReport() {
  const result = await query(`
    WITH assignment_counts AS (
      SELECT variant_id, count(DISTINCT user_id)::int AS assigned_users
      FROM user_experiment_assignments
      GROUP BY variant_id
    ),
    event_counts AS (
      SELECT
        variant_id,
        count(*)::int AS events,
        COALESCE(sum(CASE WHEN event_type IN ('like','save') THEN 1 ELSE 0 END)::numeric / NULLIF(count(*), 0), 0) AS positive_rate,
        COALESCE(sum(CASE WHEN event_type = 'dislike' THEN 1 ELSE 0 END)::numeric / NULLIF(count(*), 0), 0) AS dislike_rate
      FROM experiment_events
      GROUP BY variant_id
    )
    SELECT
      experiments.key AS experiment_key,
      experiments.name,
      experiments.hypothesis,
      experiment_variants.key AS variant,
      experiment_variants.algorithm,
      COALESCE(assignment_counts.assigned_users, 0) AS assigned_users,
      COALESCE(event_counts.events, 0) AS events,
      COALESCE(event_counts.positive_rate, 0) AS positive_rate,
      COALESCE(event_counts.dislike_rate, 0) AS dislike_rate
    FROM experiments
    JOIN experiment_variants ON experiment_variants.experiment_id = experiments.id
    LEFT JOIN assignment_counts ON assignment_counts.variant_id = experiment_variants.id
    LEFT JOIN event_counts ON event_counts.variant_id = experiment_variants.id
    ORDER BY experiments.key, experiment_variants.key
  `);
  const rows = result.rows.map((row) => ({
    experimentKey: row.experiment_key,
    name: row.name,
    hypothesis: row.hypothesis,
    variant: row.variant,
    algorithm: row.algorithm,
    assignedUsers: Number(row.assigned_users),
    events: Number(row.events),
    positiveRate: Number(row.positive_rate),
    dislikeRate: Number(row.dislike_rate)
  }));
  return enrichExperimentStats(rows);
}

export function enrichExperimentStats(rows: Array<{
  experimentKey: string;
  name: string;
  hypothesis: string;
  variant: string;
  algorithm: string;
  assignedUsers: number;
  events: number;
  positiveRate: number;
  dislikeRate: number;
}>) {
  const byExperiment = new Map<string, typeof rows>();
  for (const row of rows) {
    const group = byExperiment.get(row.experimentKey) ?? [];
    group.push(row);
    byExperiment.set(row.experimentKey, group);
  }

  return rows.map((row) => {
    const group = byExperiment.get(row.experimentKey) ?? [];
    const baseline = group.find((candidate) => candidate.variant === "A") ?? group[0] ?? row;
    const lift = row.positiveRate - baseline.positiveRate;
    const relativeLift = baseline.positiveRate ? lift / baseline.positiveRate : 0;
    const standardError = twoProportionStandardError(row.positiveRate, row.events, baseline.positiveRate, baseline.events);
    const margin = 1.96 * standardError;
    const ciLow = lift - margin;
    const ciHigh = lift + margin;
    const significant = row.variant !== baseline.variant && row.events >= 30 && baseline.events >= 30 && (ciLow > 0 || ciHigh < 0);
    return {
      ...row,
      baselineVariant: baseline.variant,
      lift: round(lift),
      relativeLift: round(relativeLift),
      confidenceInterval95: { low: round(ciLow), high: round(ciHigh) },
      standardError: round(standardError),
      significance: significant ? (lift > 0 ? "winner" : "underperforming") : "inconclusive",
      recommendation: recommendationLabel(row, baseline, significant, lift)
    };
  });
}

function twoProportionStandardError(p1: number, n1: number, p2: number, n2: number) {
  if (!n1 || !n2) return 0;
  return Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
}

function recommendationLabel(row: { variant: string; events: number }, baseline: { variant: string; events: number }, significant: boolean, lift: number) {
  if (row.variant === baseline.variant) return "baseline";
  if (row.events < 30 || baseline.events < 30) return "collect more data";
  if (!significant) return "no clear winner";
  return lift > 0 ? "promote variant" : "keep baseline";
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function deterministicBucket(value: string) {
  const hash = createHash("sha256").update(value).digest();
  return hash.readUInt32BE(0) % 100;
}
