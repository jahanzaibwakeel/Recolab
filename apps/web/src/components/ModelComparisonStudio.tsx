"use client";

import { useState } from "react";
import type { UserProfile } from "@recolab/shared";
import { Columns3 } from "lucide-react";
import { RecoApi } from "../lib/api";

export function ModelComparisonStudio({ users }: { users: UserProfile[] }) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [comparison, setComparison] = useState<any>(null);
  const [status, setStatus] = useState("Compare algorithm behavior side by side.");

  async function compare() {
    setStatus("Running model comparison");
    const result = await RecoApi.modelComparison({
      userId,
      algorithms: ["hybrid", "semantic", "content", "collaborative", "popularity"],
      k: 8
    });
    setComparison(result);
    setStatus("Comparison ready");
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Ranking behavior</p>
          <h3><Columns3 size={16} /> Model Comparison Studio</h3>
        </div>
        <span className="muted">{status}</span>
      </div>

      <div className="toolbar">
        <select className="select" value={userId} onChange={(event) => setUserId(event.target.value)}>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
        <button className="select" onClick={compare}>Compare models</button>
      </div>

      {comparison ? (
        <>
          <div className="comparison-grid">
            {comparison.rows.map((row: any) => (
              <article className="metric comparison-card" key={row.algorithm}>
                <span>{row.algorithm}</span>
                <strong>{row.summary.averageScore.toFixed(2)}</strong>
                <p className="muted">diversity {row.summary.diversityRatio.toFixed(2)} - genres {row.summary.uniqueGenreCount}</p>
                <div className="chips">
                  {Object.entries(row.summary.contributionAverages ?? {}).map(([name, value]) => (
                    <span className="chip" key={name}>{name}: {Number(value).toFixed(2)}</span>
                  ))}
                </div>
                <ol className="compact-list">
                  {row.recommendations.slice(0, 5).map((rec: any) => (
                    <li key={rec.itemId}>{rec.title}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          <section className="debug-grid">
            <article className="panel">
              <div className="section-title">
                <h3>Pairwise overlap</h3>
                <span className="muted">top-k similarity</span>
              </div>
              {comparison.pairwiseOverlap.map((pair: any) => (
                <div className="candidate-row" key={`${pair.left}-${pair.right}`}>
                  <span>{pair.overlap}</span>
                  <strong>{pair.left} vs {pair.right}</strong>
                  <em>{pair.jaccard.toFixed(2)}</em>
                </div>
              ))}
            </article>

            <article className="panel">
              <div className="section-title">
                <h3>Interpretation notes</h3>
                <span className="muted">how to read this</span>
              </div>
              {(comparison.notes ?? []).map((note: string) => <p className="muted" key={note}>{note}</p>)}
            </article>
          </section>
        </>
      ) : (
        <p className="muted">Run comparison to see overlap, diversity, score summaries, and top item differences.</p>
      )}
    </section>
  );
}

