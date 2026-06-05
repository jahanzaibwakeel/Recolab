"use client";

import { useEffect, useState } from "react";
import { RecoApi } from "../lib/api";

export function TraceRetentionPanel() {
  const [report, setReport] = useState<any>({ policy: {}, sampledTraceEvents: {}, explanationLogs: {}, recommendationResults: {} });
  const [sampleRate, setSampleRate] = useState(0.25);
  const [retentionDays, setRetentionDays] = useState(30);
  const [exportFormat, setExportFormat] = useState<"json" | "html" | "both">("both");
  const [storageMode, setStorageMode] = useState<"download_only" | "local_file">("download_only");
  const [includeFeatureValues, setIncludeFeatureValues] = useState(true);
  const [status, setStatus] = useState("Loading trace retention policy");

  async function load() {
    const nextReport = await RecoApi.traceRetention();
    setReport(nextReport);
    setSampleRate(Number(nextReport.policy?.sample_rate ?? 0.25));
    setRetentionDays(Number(nextReport.policy?.retention_days ?? 30));
    setExportFormat(nextReport.policy?.export_format ?? "both");
    setStorageMode(nextReport.policy?.storage_mode ?? "download_only");
    setIncludeFeatureValues(nextReport.policy?.include_feature_values !== false);
    setStatus("Trace retention ready");
  }

  async function savePolicy() {
    setStatus("Saving trace retention policy");
    await RecoApi.updateTraceRetentionPolicy({ sampleRate, retentionDays, exportFormat, storageMode, includeFeatureValues });
    await load();
    setStatus("Trace policy saved");
  }

  async function cleanup() {
    setStatus("Running trace cleanup");
    const result = await RecoApi.cleanupTraceRetention();
    await load();
    setStatus(`Cleanup removed ${result.deletedTraceEvents} trace events`);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <h3>Trace Sampling and Retention</h3>
          <p className="muted">control explainability trace storage and cleanup</p>
        </div>
        <span className="muted">{status}</span>
      </div>
      <section className="metric-strip">
        <div className="metric"><span>Sample rate</span><strong>{Math.round(Number(report.policy?.sample_rate ?? 0) * 100)}%</strong></div>
        <div className="metric"><span>Retention days</span><strong>{report.policy?.retention_days ?? 0}</strong></div>
        <div className="metric"><span>Sampled traces</span><strong>{report.sampledTraceEvents?.sampled ?? 0}</strong></div>
        <div className="metric"><span>Export mode</span><strong>{report.policy?.export_format ?? "both"}</strong></div>
      </section>
      <div className="toolbar" style={{ marginTop: 14 }}>
        <label className="slider-row" style={{ borderBottom: 0 }}>
          <span>sample</span>
          <input type="range" min="0" max="1" step="0.05" value={sampleRate} onChange={(event) => setSampleRate(Number(event.target.value))} />
          <strong>{Math.round(sampleRate * 100)}%</strong>
        </label>
        <input className="input number-input" type="number" min="1" max="3650" value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value))} aria-label="Retention days" />
        <select className="select" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as "json" | "html" | "both")}>
          <option value="both">Both exports</option>
          <option value="json">JSON only</option>
          <option value="html">HTML only</option>
        </select>
        <select className="select" value={storageMode} onChange={(event) => setStorageMode(event.target.value as "download_only" | "local_file")}>
          <option value="download_only">Download only</option>
          <option value="local_file">Local file policy</option>
        </select>
        <label className="preference-field" style={{ padding: 9 }}>
          <input type="checkbox" checked={includeFeatureValues} onChange={(event) => setIncludeFeatureValues(event.target.checked)} /> Feature values
        </label>
        <button className="select" onClick={() => savePolicy().catch((error) => setStatus(error.message))}>Save policy</button>
        <button className="select" onClick={() => cleanup().catch((error) => setStatus(error.message))}>Run cleanup</button>
      </div>
    </section>
  );
}
