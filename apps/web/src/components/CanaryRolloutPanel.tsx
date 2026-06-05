"use client";

import { useEffect, useState } from "react";
import { RecoApi } from "../lib/api";

function pct(value: unknown) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

export function CanaryRolloutPanel() {
  const [report, setReport] = useState<any>({ summary: {}, rollouts: [] });
  const [candidateVersion, setCandidateVersion] = useState("");
  const [trafficPercent, setTrafficPercent] = useState(10);
  const [status, setStatus] = useState("Loading canary rollouts");

  async function load() {
    const nextReport = await RecoApi.modelCanaries();
    setReport(nextReport);
    const firstApproved = (nextReport.rollouts ?? []).find((row: any) => row.candidate_approval_status === "approved");
    if (!candidateVersion && firstApproved) setCandidateVersion(firstApproved.candidate_version);
    setStatus("Canary simulation ready");
  }

  async function create() {
    setStatus("Starting canary simulation");
    await RecoApi.createCanary({ candidateVersion, trafficPercent, notes: "Guarded canary rollout from admin dashboard" });
    await load();
    setStatus("Canary started");
  }

  async function action(id: string, nextAction: "expand" | "pause" | "rollback" | "promote" | "enable_live" | "disable_live") {
    setStatus(`${nextAction} canary`);
    await RecoApi.updateCanary(id, { action: nextAction, trafficPercent });
    await load();
    setStatus(`Canary ${nextAction}`);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  const candidateOptions = Array.from(new Set((report.rollouts ?? []).map((row: any) => row.candidate_version).filter(Boolean)));

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <h3>Canary Rollouts</h3>
          <p className="muted">traffic split simulation for approved model versions</p>
        </div>
        <span className="muted">{status}</span>
      </div>

      <section className="metric-strip">
        <div className="metric"><span>Running</span><strong>{report.summary?.running ?? 0}</strong></div>
        <div className="metric"><span>Paused</span><strong>{report.summary?.paused ?? 0}</strong></div>
        <div className="metric"><span>Promoted</span><strong>{report.summary?.promoted ?? 0}</strong></div>
        <div className="metric"><span>Active model</span><strong>{report.activeModelVersion ?? "local"}</strong></div>
      </section>

      <div className="toolbar" style={{ marginTop: 14 }}>
        <input className="input wide-input" value={candidateVersion} onChange={(event) => setCandidateVersion(event.target.value)} placeholder="approved model version" list="canary-candidates" />
        <datalist id="canary-candidates">
          {candidateOptions.map((version) => <option key={String(version)} value={String(version)} />)}
        </datalist>
        <input className="input number-input" type="number" min="1" max="100" value={trafficPercent} onChange={(event) => setTrafficPercent(Number(event.target.value))} aria-label="Traffic percent" />
        <button className="select" disabled={!candidateVersion} onClick={() => create().catch((error) => setStatus(error.message))}>Start canary</button>
      </div>

      <div className="governance-list">
        {(report.rollouts ?? []).slice(0, 6).map((rollout: any) => (
          <article className="metric governance-row" key={rollout.id}>
            <div>
              <div className="toolbar">
                <strong>{rollout.candidate_version}</strong>
                <span className={`status-pill ${rollout.status}`}>{rollout.status}</span>
                <span className="chip">{rollout.traffic_percent}% traffic</span>
                <span className={`status-pill ${rollout.live_routing_enabled ? "active" : "archived"}`}>{rollout.live_routing_enabled ? "live" : "sim only"}</span>
              </div>
              <p className="muted">
                assigned {rollout.assignedUsers}/{rollout.totalEligibleUsers} users - recommendation {rollout.simulation?.recommendation}
              </p>
              <p className="muted">
                NDCG delta {pct(rollout.simulation?.ndcgDelta)} - precision delta {pct(rollout.simulation?.precisionDelta)}
              </p>
            </div>
            <div className="toolbar">
              <button className="select" onClick={() => action(rollout.id, "expand").catch((error) => setStatus(error.message))}>Expand</button>
              <button className="select" onClick={() => action(rollout.id, "pause").catch((error) => setStatus(error.message))}>Pause</button>
              <button className="select" onClick={() => action(rollout.id, "rollback").catch((error) => setStatus(error.message))}>Rollback</button>
              <button className="select" onClick={() => action(rollout.id, "promote").catch((error) => setStatus(error.message))}>Promote</button>
              <button className="select" onClick={() => action(rollout.id, rollout.live_routing_enabled ? "disable_live" : "enable_live").catch((error) => setStatus(error.message))}>
                {rollout.live_routing_enabled ? "Disable live" : "Enable live"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
