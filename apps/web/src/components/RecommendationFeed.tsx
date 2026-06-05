"use client";

import { useEffect, useState } from "react";
import { Bookmark, Bug, Heart, ThumbsDown } from "lucide-react";
import type { RecommendationAlgorithm, RecommendationResult, UserProfile } from "@recolab/shared";
import { RecoApi } from "../lib/api";
import Link from "next/link";
import { RecommendationDebuggerModal } from "./RecommendationDebuggerModal";

const algorithms: RecommendationAlgorithm[] = ["hybrid", "semantic", "content", "collaborative", "popularity"];

export function RecommendationFeed({ initialUsers }: { initialUsers: UserProfile[] }) {
  const [users] = useState(initialUsers);
  const [userId, setUserId] = useState(initialUsers[0]?.id ?? "");
  const [algorithm, setAlgorithm] = useState<RecommendationAlgorithm>("hybrid");
  const [rows, setRows] = useState<RecommendationResult[]>([]);
  const [status, setStatus] = useState("Loading recommendations");
  const [trace, setTrace] = useState<any>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  async function load(nextUserId = userId, nextAlgorithm = algorithm) {
    setStatus("Scoring");
    const recs = await RecoApi.recommendations(nextUserId, nextAlgorithm);
    setRows(recs);
    setStatus("Ready");
  }

  useEffect(() => {
    if (userId) load(userId, algorithm).catch((error) => setStatus(error.message));
  }, []);

  async function feedback(itemId: string, action: "like" | "dislike" | "save") {
    await RecoApi.feedback(userId, itemId, action);
    setStatus(`${action} recorded`);
  }

  async function openTrace(itemId: string) {
    setTraceLoading(true);
    setTrace(null);
    try {
      setTrace(await RecoApi.recommendationTrace(userId, itemId, algorithm));
    } finally {
      setTraceLoading(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Local AI explanations via Ollama</p>
          <h2>Recommendation Feed</h2>
        </div>
        <div className="toolbar">
          <select className="select" value={userId} onChange={(event) => { setUserId(event.target.value); load(event.target.value, algorithm); }}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.role}</option>)}
          </select>
          <div className="segmented">
            {algorithms.map((option) => (
              <button key={option} className={algorithm === option ? "active" : ""} onClick={() => { setAlgorithm(option); load(userId, option); }}>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="muted">{status}. Results are cached in Valkey and refreshed when ratings or feedback change.</p>

      <section className="grid">
        {rows.map((rec) => (
          <article className="card" key={rec.item.id}>
            <div className="card-head">
              <div>
                <Link href={`/items/${rec.item.id}`}><h3>{rec.item.title}</h3></Link>
                <p className="muted">{rec.item.domain} - {rec.item.genres.join(", ")}</p>
              </div>
              <span className="score">{rec.score.toFixed(2)}</span>
            </div>
            <p className="muted">{rec.item.description}</p>
            <div className="chips">
              {rec.item.tags.slice(0, 4).map((tag) => <span className="chip" key={tag}>{tag}</span>)}
            </div>
            <div className="explanation">
              <strong>Why this was recommended</strong>
              <p className="muted">{rec.explanation.generatedText}</p>
              <div className="chips">
                {Object.entries(rec.explanation.modelContributions).map(([name, value]) => (
                  <span className="chip" key={name}>{name}: {value.toFixed(2)}</span>
                ))}
              </div>
              {rec.explanation.pipeline?.length ? (
                <div className="chips" style={{ marginTop: 8 }}>
                  {rec.explanation.pipeline.map((stage) => (
                    <span className="chip" key={stage.stage}>{stage.stage}: {stage.outputCount}</span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="actions">
              <button className="icon-button" title="Like" onClick={() => feedback(rec.item.id, "like")}><Heart size={16} /></button>
              <button className="icon-button" title="Dislike" onClick={() => feedback(rec.item.id, "dislike")}><ThumbsDown size={16} /></button>
              <button className="icon-button" title="Save" onClick={() => feedback(rec.item.id, "save")}><Bookmark size={16} /></button>
              <button className="icon-button" title="Debug trace" onClick={() => openTrace(rec.item.id)}><Bug size={16} /></button>
            </div>
          </article>
        ))}
      </section>

      {(trace || traceLoading) ? (
        <RecommendationDebuggerModal trace={trace} loading={traceLoading} userId={userId} algorithm={algorithm} onClose={() => { setTrace(null); setTraceLoading(false); }} />
      ) : null}
    </>
  );
}
