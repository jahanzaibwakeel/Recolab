"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RecoApi } from "../lib/api";

export function DataQualityPanel() {
  const [report, setReport] = useState<any>({ summary: {}, sparseUsers: [], coldStartItems: [], domainCoverage: [], genreCoverage: [], metadataGaps: [] });
  const [status, setStatus] = useState("Loading data quality");

  async function load() {
    setStatus("Checking catalog and interaction health");
    const data = await RecoApi.dataQuality();
    setReport(data);
    setStatus("Data quality ready");
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Data quality</p>
          <h3>Coverage and Cold-Start Gaps</h3>
        </div>
        <span className="muted">{status}</span>
      </div>

      <div className="metric-strip">
        <div className="metric"><span>Sparse users</span><strong>{report.summary.sparseUsers ?? 0}</strong></div>
        <div className="metric"><span>Cold-start items</span><strong>{report.summary.coldStartItems ?? 0}</strong></div>
        <div className="metric"><span>Cold-start rate</span><strong>{Math.round((report.summary.coldStartItemRate ?? 0) * 100)}%</strong></div>
        <div className="metric"><span>Metadata gaps</span><strong>{report.summary.metadataGapItems ?? 0}</strong></div>
      </div>

      <div className="dashboard">
        <article>
          <h3>Genre Coverage</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={(report.genreCoverage ?? []).slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="genre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="itemCount" fill="#24745a" />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article>
          <h3>Cold-Start Items</h3>
          {(report.coldStartItems ?? []).slice(0, 6).map((item: any) => (
            <div className="candidate-row" key={item.id}>
              <span>{item.domain}</span>
              <strong>{item.title}</strong>
              <em>{item.ratingCount}</em>
            </div>
          ))}
          {!(report.coldStartItems ?? []).length ? <p className="muted">No cold-start items found.</p> : null}
        </article>
      </div>

      <div className="dashboard">
        <article>
          <h3>Sparse Users</h3>
          {(report.sparseUsers ?? []).slice(0, 6).map((user: any) => (
            <div className="candidate-row" key={user.id}>
              <span>{user.ratingCount}</span>
              <strong>{user.name}</strong>
              <em>{Number(user.avgRating ?? 0).toFixed(1)}</em>
            </div>
          ))}
          {!(report.sparseUsers ?? []).length ? <p className="muted">No sparse users found.</p> : null}
        </article>

        <article>
          <h3>Domain Coverage</h3>
          <div className="chips">
            {(report.domainCoverage ?? []).map((entry: any) => <span className="chip" key={entry.domain}>{entry.domain}: {entry.itemCount}</span>)}
          </div>
          <h3 style={{ marginTop: 14 }}>Metadata Gaps</h3>
          {(report.metadataGaps ?? []).slice(0, 4).map((item: any) => <p className="muted" key={item.id}>{item.title}</p>)}
          {!(report.metadataGaps ?? []).length ? <p className="muted">No metadata gaps found.</p> : null}
        </article>
      </div>
    </section>
  );
}
