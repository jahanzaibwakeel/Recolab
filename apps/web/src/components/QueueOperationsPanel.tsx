"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { RecoApi } from "../lib/api";

export function QueueOperationsPanel() {
  const [queue, setQueue] = useState<any>({ counts: {}, recent: [], status: "loading" });
  const [status, setStatus] = useState("Loading queue status");

  async function load() {
    const result = await RecoApi.queues();
    setQueue(result);
    setStatus(`Queue ${result.status}`);
  }

  async function enqueueRefresh() {
    setStatus("Queueing model refresh");
    await RecoApi.queueModelRefresh();
    await load();
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Background jobs</p>
          <h3><ListChecks size={16} /> Queue Operations</h3>
        </div>
        <span className="muted">{status}</span>
      </div>

      <div className="toolbar">
        <button className="select" onClick={load}>Refresh queue</button>
        <button className="select" onClick={enqueueRefresh}>Queue model refresh</button>
      </div>

      <div className="metric-strip">
        {["waiting", "active", "completed", "failed", "delayed", "paused"].map((name) => (
          <div className="metric" key={name}>
            <span>{name}</span>
            <strong>{queue.counts?.[name] ?? 0}</strong>
          </div>
        ))}
      </div>

      <section className="debug-grid">
        <article className="panel">
          <div className="section-title">
            <h3>Recent jobs</h3>
            <span className="muted">{queue.queue ?? "model-refresh"}</span>
          </div>
          {(queue.recent ?? []).slice(0, 6).map((job: any) => (
            <div className="candidate-row" key={job.id}>
              <span>{job.id}</span>
              <strong>{job.name}</strong>
              <em>{job.attemptsMade}</em>
            </div>
          ))}
          {queue.error ? <p className="muted">{queue.error}</p> : null}
        </article>

        <article className="panel">
          <div className="section-title">
            <h3>Failures</h3>
            <span className="muted">latest</span>
          </div>
          {(queue.failed ?? []).slice(0, 5).map((job: any) => (
            <div className="metric" key={job.id} style={{ marginTop: 8 }}>
              <strong>{job.name} #{job.id}</strong>
              <p className="muted">{job.failedReason ?? "No failure reason recorded"}</p>
            </div>
          ))}
          {!(queue.failed ?? []).length ? <p className="muted">No failed jobs reported.</p> : null}
        </article>
      </section>
    </section>
  );
}

