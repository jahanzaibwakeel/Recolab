"use client";

import { useEffect, useState } from "react";
import { RecoApi } from "../lib/api";

function formatMetric(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(3) : "0.000";
}

export function ModelGovernancePanel({ onChanged }: { onChanged?: () => void }) {
  const [report, setReport] = useState<any>({ summary: {}, versions: [] });
  const [notes, setNotes] = useState("Candidate reviewed against offline metrics and demo acceptance criteria.");
  const [status, setStatus] = useState("Loading governance queue");

  async function load() {
    const nextReport = await RecoApi.modelGovernance();
    setReport(nextReport);
    setStatus("Governance queue ready");
  }

  async function act(action: "approve" | "reject" | "activate", version: string) {
    setStatus(`${action} ${version}`);
    if (action === "approve") await RecoApi.approveModelVersion(version, notes);
    if (action === "reject") await RecoApi.rejectModelVersion(version, notes);
    if (action === "activate") await RecoApi.activateModelVersion(version, notes);
    await load();
    onChanged?.();
    setStatus(`Model ${action}d`);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <h3>Model Governance</h3>
          <p className="muted">approval workflow for batch-scored model versions</p>
        </div>
        <span className="muted">{status}</span>
      </div>

      <section className="metric-strip">
        <div className="metric"><span>Pending</span><strong>{report.summary?.pending ?? 0}</strong></div>
        <div className="metric"><span>Approved</span><strong>{report.summary?.approved ?? 0}</strong></div>
        <div className="metric"><span>Rejected</span><strong>{report.summary?.rejected ?? 0}</strong></div>
        <div className="metric"><span>Active</span><strong>{report.summary?.active ?? 0}</strong></div>
      </section>

      <div className="toolbar" style={{ marginTop: 14 }}>
        <input
          className="input wide-input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          aria-label="Governance notes"
        />
        <button className="select" onClick={() => load().catch((error) => setStatus(error.message))}>Refresh</button>
      </div>

      <div className="governance-list">
        {(report.versions ?? []).slice(0, 8).map((version: any) => {
          const evaluation = Array.isArray(version.metrics) ? version.metrics[0] : null;
          return (
            <article className="metric governance-row" key={version.version}>
              <div>
                <div className="toolbar">
                  <strong>{version.version}</strong>
                  <span className={`status-pill ${version.approval_status}`}>{version.approval_status}</span>
                  <span className={`status-pill ${version.status}`}>{version.status}</span>
                </div>
                <p className="muted">
                  precision {formatMetric(evaluation?.precisionAtK)} - recall {formatMetric(evaluation?.recallAtK)} - NDCG {formatMetric(evaluation?.ndcgAtK)}
                </p>
                <p className="muted">{version.governance_notes ?? version.rejection_reason ?? version.artifact_path}</p>
              </div>
              <div className="toolbar">
                <button className="select" disabled={version.approval_status === "approved"} onClick={() => act("approve", version.version).catch((error) => setStatus(error.message))}>Approve</button>
                <button className="select" disabled={version.status === "active" || version.approval_status === "rejected"} onClick={() => act("reject", version.version).catch((error) => setStatus(error.message))}>Reject</button>
                <button className="select" disabled={version.status === "active" || version.approval_status === "rejected"} onClick={() => act("activate", version.version).catch((error) => setStatus(error.message))}>Activate</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
