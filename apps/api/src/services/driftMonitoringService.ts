import { query } from "../db/pool.js";

function severity(delta: number, warning = 0.15, critical = 0.3) {
  const absolute = Math.abs(delta);
  if (absolute >= critical) return "critical";
  if (absolute >= warning) return "warning";
  return "ok";
}

function pct(value: number) {
  return Number(value.toFixed(4));
}

export async function driftReport() {
  const [result, baselines] = await Promise.all([query(`
    WITH windows AS (
      SELECT 'recent' AS window_name, now() - interval '7 days' AS start_at, now() AS end_at
      UNION ALL
      SELECT 'baseline', now() - interval '37 days', now() - interval '7 days'
    ),
    rating_stats AS (
      SELECT windows.window_name, count(ratings.id)::int AS rating_count, coalesce(avg(ratings.rating), 0)::float AS avg_rating
      FROM windows
      LEFT JOIN ratings ON ratings.created_at >= windows.start_at AND ratings.created_at < windows.end_at
      GROUP BY windows.window_name
    ),
    feedback_stats AS (
      SELECT
        windows.window_name,
        count(interactions.id)::int AS event_count,
        coalesce(avg(CASE WHEN interactions.event_type IN ('like','save') THEN 1 ELSE 0 END), 0)::float AS positive_rate,
        coalesce(avg(CASE WHEN interactions.event_type = 'dislike' THEN 1 ELSE 0 END), 0)::float AS dislike_rate
      FROM windows
      LEFT JOIN interactions ON interactions.created_at >= windows.start_at AND interactions.created_at < windows.end_at
      GROUP BY windows.window_name
    ),
    rec_stats AS (
      SELECT windows.window_name, count(recommendation_results.id)::int AS served_count, coalesce(avg(recommendation_results.score), 0)::float AS avg_score
      FROM windows
      LEFT JOIN recommendation_results ON recommendation_results.created_at >= windows.start_at AND recommendation_results.created_at < windows.end_at
      GROUP BY windows.window_name
    )
    SELECT
      jsonb_object_agg(rating_stats.window_name, to_jsonb(rating_stats)) AS ratings,
      (SELECT jsonb_object_agg(feedback_stats.window_name, to_jsonb(feedback_stats)) FROM feedback_stats) AS feedback,
      (SELECT jsonb_object_agg(rec_stats.window_name, to_jsonb(rec_stats)) FROM rec_stats) AS recommendations
    FROM rating_stats
  `), featureBaselineStatus()]);

  const row = result.rows[0] ?? {};
  const recentRatings = row.ratings?.recent ?? {};
  const baselineRatings = row.ratings?.baseline ?? {};
  const recentFeedback = row.feedback?.recent ?? {};
  const baselineFeedback = row.feedback?.baseline ?? {};
  const recentRecommendations = row.recommendations?.recent ?? {};
  const baselineRecommendations = row.recommendations?.baseline ?? {};

  const signals = [
    {
      key: "avg_rating",
      label: "Average rating drift",
      recent: Number(recentRatings.avg_rating ?? 0),
      baseline: Number(baselineRatings.avg_rating ?? 0),
      delta: pct(Number(recentRatings.avg_rating ?? 0) - Number(baselineRatings.avg_rating ?? 0))
    },
    {
      key: "positive_feedback",
      label: "Positive feedback rate drift",
      recent: Number(recentFeedback.positive_rate ?? 0),
      baseline: Number(baselineFeedback.positive_rate ?? 0),
      delta: pct(Number(recentFeedback.positive_rate ?? 0) - Number(baselineFeedback.positive_rate ?? 0))
    },
    {
      key: "dislike_rate",
      label: "Dislike rate drift",
      recent: Number(recentFeedback.dislike_rate ?? 0),
      baseline: Number(baselineFeedback.dislike_rate ?? 0),
      delta: pct(Number(recentFeedback.dislike_rate ?? 0) - Number(baselineFeedback.dislike_rate ?? 0))
    },
    {
      key: "avg_recommendation_score",
      label: "Recommendation score drift",
      recent: Number(recentRecommendations.avg_score ?? 0),
      baseline: Number(baselineRecommendations.avg_score ?? 0),
      delta: pct(Number(recentRecommendations.avg_score ?? 0) - Number(baselineRecommendations.avg_score ?? 0))
    }
  ].map((signal) => ({ ...signal, severity: severity(signal.delta) }));

  const status = signals.some((signal) => signal.severity === "critical")
    ? "critical"
    : signals.some((signal) => signal.severity === "warning")
      ? "warning"
      : "ok";

  return {
    status,
    windows: { recentDays: 7, baselineDays: 30 },
    volumes: {
      recentRatings: Number(recentRatings.rating_count ?? 0),
      baselineRatings: Number(baselineRatings.rating_count ?? 0),
      recentFeedback: Number(recentFeedback.event_count ?? 0),
      baselineFeedback: Number(baselineFeedback.event_count ?? 0),
      recentRecommendations: Number(recentRecommendations.served_count ?? 0),
      baselineRecommendations: Number(baselineRecommendations.served_count ?? 0)
    },
    signals,
    featureBaselines: baselines
  };
}

export async function captureFeatureDriftBaselines(actorId: string | null, baselineWindowDays = 30) {
  const metrics = await currentFeatureMetrics();
  await Promise.all(metrics.map((metric) => query(
    `INSERT INTO drift_feature_baselines(feature_key, feature_label, baseline_value, baseline_window_days, metadata, captured_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (feature_key) DO UPDATE SET
       feature_label = EXCLUDED.feature_label,
       baseline_value = EXCLUDED.baseline_value,
       baseline_window_days = EXCLUDED.baseline_window_days,
       metadata = EXCLUDED.metadata,
       captured_by = EXCLUDED.captured_by,
       captured_at = now()
     RETURNING *`,
    [metric.key, metric.label, metric.value, baselineWindowDays, metric.metadata, actorId]
  )));
  return featureBaselineStatus();
}

async function currentFeatureMetrics() {
  const result = await query(`
    SELECT
      (SELECT coalesce(avg(rating_count), 0)::float FROM user_features) AS avg_user_rating_count,
      (SELECT coalesce(avg(popularity_score), 0)::float FROM item_features) AS avg_item_popularity,
      (SELECT coalesce(avg(dislike_rate), 0)::float FROM item_features) AS avg_item_dislike_rate,
      (SELECT count(*)::float FROM items WHERE array_length(genres, 1) IS NULL OR array_length(genres, 1) = 0) AS missing_genre_items
  `);
  const row = result.rows[0] ?? {};
  return [
    { key: "avg_user_rating_count", label: "Average user rating count", value: Number(row.avg_user_rating_count ?? 0), metadata: { source: "user_features" } },
    { key: "avg_item_popularity", label: "Average item popularity", value: Number(row.avg_item_popularity ?? 0), metadata: { source: "item_features" } },
    { key: "avg_item_dislike_rate", label: "Average item dislike rate", value: Number(row.avg_item_dislike_rate ?? 0), metadata: { source: "item_features" } },
    { key: "missing_genre_items", label: "Missing genre item count", value: Number(row.missing_genre_items ?? 0), metadata: { source: "items" } }
  ];
}

async function featureBaselineStatus() {
  const [metrics, baselines] = await Promise.all([
    currentFeatureMetrics(),
    query("SELECT * FROM drift_feature_baselines ORDER BY feature_key")
  ]);
  const baselineMap = new Map(baselines.rows.map((row) => [row.feature_key, row]));
  return metrics.map((metric) => {
    const baseline = baselineMap.get(metric.key) as any;
    const baselineValue = Number(baseline?.baseline_value ?? metric.value);
    const delta = pct(metric.value - baselineValue);
    return {
      ...metric,
      baseline: baselineValue,
      delta,
      severity: severity(delta),
      capturedAt: baseline?.captured_at ?? null
    };
  });
}
