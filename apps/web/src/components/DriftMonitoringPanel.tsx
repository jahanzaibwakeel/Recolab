"use client";

import { useEffect, useState } from "react";
import { RecoApi } from "../lib/api";

function value(value: unknown) {
  return Number(value ?? 0).toFixed(3);
}

export function DriftMonitoringPanel() {
  const [report, setReport] = useState<any>({ status: "ok", signals: [], volumes: {} });
  const [status, setStatus] = useState("Loading drift report");

  async function load() {
    const nextReport = await RecoApi.driftReport();
    setReport(nextReport);
    setStatus("Drift report ready");
  }

  async function captureBaselines() {
    setStatus("Capturing feature drift baselines");
    await RecoApi.captureDriftBaselines(30);
    await load();
    setStatus("Feature baselines captured");
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <h3>Drift Monitoring</h3>
          <p className="muted">recent 7 days versus 30-day baseline</p>
        </div>
        <div className="toolbar">
          <span className={`status-pill ${report.status}`}>{report.status}</span>
          <button className="select" onClick={() => captureBaselines().catch((error) => setStatus(error.message))}>Capture baselines</button>
        </div>
      </div>
      <p className="muted">{status}</p>
      <section className="metric-strip">
        <div className="metric"><span>Recent ratings</span><strong>{report.volumes?.recentRatings ?? 0}</strong></div>
        <div className="metric"><span>Baseline ratings</span><strong>{report.volumes?.baselineRatings ?? 0}</strong></div>
        <div className="metric"><span>Recent feedback</span><strong>{report.volumes?.recentFeedback ?? 0}</strong></div>
        <div className="metric"><span>Recent serves</span><strong>{report.volumes?.recentRecommendations ?? 0}</strong></div>
      </section>
      <div className="comparison-grid">
        {(report.signals ?? []).map((signal: any) => (
          <div className="metric" key={signal.key}>
            <span>{signal.label}</span>
            <strong>{value(signal.delta)}</strong>
            <p className="muted">recent {value(signal.recent)} - baseline {value(signal.baseline)} - {signal.severity}</p>
          </div>
        ))}
      </div>
      <div className="comparison-grid">
        {(report.featureBaselines ?? []).map((feature: any) => (
          <div className="metric" key={feature.key}>
            <span>{feature.label}</span>
            <strong>{value(feature.delta)}</strong>
            <p className="muted">current {value(feature.value)} - baseline {value(feature.baseline)} - {feature.severity}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
