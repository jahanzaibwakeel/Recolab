"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { UserProfile } from "@recolab/shared";
import { RecoApi } from "../lib/api";
import { LoginPanel } from "./LoginPanel";
import { WeightTuningPlayground } from "./WeightTuningPlayground";
import { ModelComparisonStudio } from "./ModelComparisonStudio";
import { ImportPipelinePanel } from "./ImportPipelinePanel";
import { QueueOperationsPanel } from "./QueueOperationsPanel";
import { DataQualityPanel } from "./DataQualityPanel";
import { ModelGovernancePanel } from "./ModelGovernancePanel";
import { PrivacyAuditPanel } from "./PrivacyAuditPanel";
import { CanaryRolloutPanel } from "./CanaryRolloutPanel";
import { DriftMonitoringPanel } from "./DriftMonitoringPanel";
import { TraceRetentionPanel } from "./TraceRetentionPanel";

export function AdminDashboard({ users }: { users: UserProfile[] }) {
  const [metrics, setMetrics] = useState<any>({ evaluation: [], counts: {} });
  const [abTest, setAbTest] = useState<any>(null);
  const [registry, setRegistry] = useState<any>({ versions: [], weightConfigs: [], embeddings: {} });
  const [experiments, setExperiments] = useState<any[]>([]);
  const [observability, setObservability] = useState<any>({ timers: {}, counters: {}, derived: {} });
  const [observabilityHistory, setObservabilityHistory] = useState<any[]>([]);
  const [observabilityAlerts, setObservabilityAlerts] = useState<any>({ status: "ok", alerts: [] });
  const [logs, setLogs] = useState<any[]>([]);
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [status, setStatus] = useState("Loading model metrics");

  async function load(nextUserId = userId) {
    const [loadedMetrics, loadedAb, loadedLogs, loadedRegistry, loadedExperiments, loadedObservability, loadedObservabilityHistory, loadedObservabilityAlerts] = await Promise.all([
      RecoApi.metrics(),
      RecoApi.abTest(nextUserId),
      RecoApi.logs(),
      RecoApi.modelRegistry(),
      RecoApi.experiments(),
      RecoApi.observability(),
      RecoApi.observabilityHistory(),
      RecoApi.observabilityAlerts()
    ]);
    setMetrics(loadedMetrics);
    setAbTest(loadedAb);
    setLogs(Array.isArray(loadedLogs) ? loadedLogs : []);
    setRegistry(loadedRegistry);
    setExperiments(Array.isArray(loadedExperiments) ? loadedExperiments : []);
    setObservability(loadedObservability);
    setObservabilityHistory(Array.isArray(loadedObservabilityHistory) ? loadedObservabilityHistory : []);
    setObservabilityAlerts(loadedObservabilityAlerts);
    setStatus("Dashboard ready");
  }

  async function evaluate() {
    setStatus("Running offline evaluation");
    await RecoApi.evaluate();
    await load(userId);
  }

  async function refreshFeatures() {
    setStatus("Refreshing feature store");
    await RecoApi.refreshFeatures();
    await load(userId);
  }

  async function rebuildEmbeddings() {
    setStatus("Rebuilding item embeddings and syncing Qdrant when available");
    await RecoApi.rebuildEmbeddings();
    await load(userId);
  }

  async function activateSemanticWeights() {
    setStatus("Activating semantic-heavy hybrid weights");
    await RecoApi.saveWeights({
      name: `semantic-heavy-${Date.now()}`,
      weights: { popularity: 0.1, content: 0.25, collaborative: 0.25, semantic: 0.4 },
      diversityLambda: 0.1,
      explorationRate: 0.12
    });
    await load(userId);
  }

  useEffect(() => {
    if (userId) load(userId).catch((error) => setStatus(error.message));
  }, []);

  const pct = (value: unknown) => (Number(value ?? 0) * 100).toFixed(1);
  const observabilitySeries = (Array.isArray(observabilityHistory) ? observabilityHistory : []).map((row) => ({
    time: new Date(row.capturedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    apiMs: row.timers?.api?.avgMs ?? 0,
    recoMs: row.timers?.recommendation?.avgMs ?? 0,
    ollamaMs: row.timers?.ollama_explanation?.avgMs ?? 0,
    cacheHit: Math.round((row.derived?.cacheHitRate ?? 0) * 100),
    llmFallback: Math.round((row.derived?.explanationFallbackRate ?? 0) * 100)
  }));

  return (
    <>
      <LoginPanel onChange={() => load(userId).catch((error) => setStatus(error.message))} />
      <div className="topbar">
        <div>
          <p className="eyebrow">Admin analytics</p>
          <h2>Model Evaluation Dashboard</h2>
        </div>
        <div className="toolbar">
          <select className="select" value={userId} onChange={(event) => { setUserId(event.target.value); load(event.target.value); }}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <button className="select" onClick={refreshFeatures}>Refresh features</button>
          <button className="select" onClick={rebuildEmbeddings}>Rebuild embeddings</button>
          <button className="select" onClick={activateSemanticWeights}>Semantic weights</button>
          <button className="select" onClick={evaluate}>Run evaluation</button>
        </div>
      </div>
      <p className="muted">{status}. Active model version: {metrics.modelVersion ?? "local-dev-v0"}.</p>

      <section className="metric-strip">
        {Object.entries(metrics.counts ?? {}).map(([name, value]) => (
          <div className="metric" key={name}><span>{name}</span><strong>{String(value)}</strong></div>
        ))}
      </section>

      <section className="dashboard">
        <article className="panel">
          <div className="section-title">
            <h3>Observability</h3>
            <span className="muted">latency, cache, AI fallback, vector search</span>
          </div>
          <div className="metric-strip">
            <div className="metric"><span>API avg ms</span><strong>{observability.timers?.api?.avgMs ?? 0}</strong></div>
            <div className="metric"><span>Reco avg ms</span><strong>{observability.timers?.recommendation?.avgMs ?? 0}</strong></div>
            <div className="metric"><span>Cache hit</span><strong>{((observability.derived?.cacheHitRate ?? 0) * 100).toFixed(0)}%</strong></div>
            <div className="metric"><span>LLM fallback</span><strong>{((observability.derived?.explanationFallbackRate ?? 0) * 100).toFixed(0)}%</strong></div>
          </div>
          <div className="metric-strip">
            <div className="metric"><span>Ollama avg ms</span><strong>{observability.timers?.ollama_explanation?.avgMs ?? 0}</strong></div>
            <div className="metric"><span>Qdrant avg ms</span><strong>{observability.timers?.qdrant_search?.avgMs ?? 0}</strong></div>
            <div className="metric"><span>Qdrant hit</span><strong>{((observability.derived?.qdrantHitRate ?? 0) * 100).toFixed(0)}%</strong></div>
            <div className="metric"><span>Embed fallback</span><strong>{((observability.derived?.embeddingFallbackRate ?? 0) * 100).toFixed(0)}%</strong></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={observabilitySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="ms" />
                <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line yAxisId="ms" type="monotone" dataKey="apiMs" stroke="#24745a" name="API avg ms" dot={false} />
                <Line yAxisId="ms" type="monotone" dataKey="recoMs" stroke="#4267ad" name="Reco avg ms" dot={false} />
                <Line yAxisId="ms" type="monotone" dataKey="ollamaMs" stroke="#c65032" name="Ollama avg ms" dot={false} />
                <Line yAxisId="pct" type="monotone" dataKey="cacheHit" stroke="#c99a30" name="Cache hit %" dot={false} />
                <Line yAxisId="pct" type="monotone" dataKey="llmFallback" stroke="#171a1f" name="LLM fallback %" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="section-title">
            <h3>Request counters</h3>
            <span className="muted">since {observability.startedAt ?? "startup"}</span>
          </div>
          {Object.entries(observability.counters ?? {}).slice(0, 10).map(([name, value]) => (
            <div className="metric" key={name} style={{ marginTop: 8 }}>
              <strong>{name}</strong>
              <p className="muted">{String(value)}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h3>Alert Thresholds</h3>
          <span className={`status-pill ${observabilityAlerts.status}`}>{observabilityAlerts.status}</span>
        </div>
        <div className="comparison-grid">
          {(observabilityAlerts.alerts ?? []).map((alert: any) => (
            <div className="metric" key={alert.key}>
              <span>{alert.label}</span>
              <strong>{alert.unit === "rate" ? `${Math.round(alert.value * 100)}%` : `${alert.value}ms`}</strong>
              <p className="muted">{alert.severity} - {alert.message}</p>
              <p className="muted">{(alert.runbook ?? []).slice(0, 2).join(" ")}</p>
            </div>
          ))}
        </div>
      </section>

      <WeightTuningPlayground users={users} onSaved={() => load(userId).catch((error) => setStatus(error.message))} />

      <ModelComparisonStudio users={users} />

      <ImportPipelinePanel onComplete={() => load(userId).catch((error) => setStatus(error.message))} />

      <QueueOperationsPanel />

      <DataQualityPanel />

      <DriftMonitoringPanel />

      <ModelGovernancePanel onChanged={() => load(userId).catch((error) => setStatus(error.message))} />

      <CanaryRolloutPanel />

      <TraceRetentionPanel />

      <PrivacyAuditPanel />

      <section className="dashboard">
        <article className="panel">
          <div className="section-title">
            <h3>Algorithm comparison</h3>
            <span className="muted">precision@k, recall@k, MAP@k, NDCG</span>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={metrics.evaluation ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="algorithm" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="precisionAtK" fill="#24745a" />
              <Bar dataKey="recallAtK" fill="#c65032" />
              <Bar dataKey="mapAtK" fill="#4267ad" />
              <Bar dataKey="ndcgAtK" fill="#c99a30" />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <div className="section-title">
            <h3>A/B test simulation</h3>
            <span className="score">{abTest?.simulatedWinner ?? "waiting"}</span>
          </div>
          <p className="muted">{abTest?.hypothesis}</p>
          {[abTest?.variantA, abTest?.variantB].filter(Boolean).map((variant: any) => (
            <div className="metric" key={variant.name}>
              <strong>{variant.name}</strong>
              <ol>
                {variant.recommendations.slice(0, 3).map((rec: any) => <li key={rec.item.id}>{rec.item.title}</li>)}
              </ol>
            </div>
          ))}
        </article>
      </section>

      <section className="dashboard">
        <article className="panel">
          <div className="section-title">
            <h3>Model registry</h3>
            <span className="muted">versions, weights, active config</span>
          </div>
          {(registry.weightConfigs ?? []).slice(0, 4).map((config: any) => (
            <div className="metric" key={config.id} style={{ marginTop: 8 }}>
              <strong>{config.name}{config.is_active ? " - active" : ""}</strong>
              <p className="muted">
                weights {JSON.stringify(config.weights)} - diversity {Number(config.diversity_lambda).toFixed(2)} - exploration {Number(config.exploration_rate).toFixed(2)}
              </p>
            </div>
          ))}
        </article>

        <article className="panel">
          <div className="section-title">
            <h3>Semantic retrieval</h3>
            <span className="score">{registry.embeddings?.embedding_count ?? 0}</span>
          </div>
          <p className="muted">Embedding model: {registry.embeddings?.embedding_model ?? "not built"}</p>
          <p className="muted">Last embedding: {registry.embeddings?.last_embedding_at ?? "never"}</p>
          <p className="muted">Last Qdrant sync: {registry.embeddings?.last_qdrant_sync_at ?? "optional service not synced"}</p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h3>Experiment tracking</h3>
          <span className="muted">assignments, events, positive rate, dislike rate</span>
        </div>
        {experiments.map((row) => (
          <div className="metric" key={`${row.experimentKey}-${row.variant}`} style={{ marginTop: 8 }}>
            <strong>{row.name} - {row.variant} - {row.algorithm} - {row.significance}</strong>
            <p className="muted">
              users {row.assignedUsers} - events {row.events} - positive {row.positiveRate.toFixed(2)} - dislike {row.dislikeRate.toFixed(2)}
            </p>
            <p className="muted">
              lift {pct(row.lift)} pts - relative {pct(row.relativeLift)}% - 95% CI [{pct(row.confidenceInterval95?.low)}, {pct(row.confidenceInterval95?.high)}] - {row.recommendation}
            </p>
          </div>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h3>Explanation logs</h3>
          <span className="muted">Ollama prompts and fallback responses are audited locally</span>
        </div>
        {logs.slice(0, 6).map((log) => (
          <div className="metric" key={log.id} style={{ marginTop: 8 }}>
            <strong>{log.title}</strong>
            <p className="muted">{log.response}</p>
          </div>
        ))}
      </section>
    </>
  );
}
