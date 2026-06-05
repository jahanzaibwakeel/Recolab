"use client";

import { useState } from "react";
import type { UserProfile } from "@recolab/shared";
import { SlidersHorizontal } from "lucide-react";
import { RecoApi } from "../lib/api";

const defaults = {
  popularity: 0.15,
  content: 0.3,
  collaborative: 0.3,
  semantic: 0.25
};

export function WeightTuningPlayground({
  users,
  onSaved
}: {
  users: UserProfile[];
  onSaved: () => void;
}) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [weights, setWeights] = useState<Record<string, number>>(defaults);
  const [diversityLambda, setDiversityLambda] = useState(0.08);
  const [explorationRate, setExplorationRate] = useState(0.08);
  const [preview, setPreview] = useState<any>(null);
  const [status, setStatus] = useState("Tune weights, preview ranking, then activate.");

  const normalized = normalize(weights);

  function updateWeight(name: string, value: number) {
    setWeights((current) => ({ ...current, [name]: value }));
  }

  async function runPreview() {
    setStatus("Previewing hybrid ranking");
    const result = await RecoApi.previewWeights({
      userId,
      weights,
      diversityLambda,
      explorationRate,
      k: 8
    });
    setPreview(result);
    setStatus("Preview ready");
  }

  async function save() {
    setStatus("Saving active weight config");
    await RecoApi.saveWeights({
      name: `playground-${Date.now()}`,
      weights,
      diversityLambda,
      explorationRate
    });
    setStatus("Weights activated and recommendation cache invalidated");
    onSaved();
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Interactive model controls</p>
          <h3><SlidersHorizontal size={16} /> Weight Tuning Playground</h3>
        </div>
        <span className="muted">{status}</span>
      </div>

      <div className="toolbar">
        <select className="select" value={userId} onChange={(event) => setUserId(event.target.value)}>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
        <button className="select" onClick={runPreview}>Preview</button>
        <button className="select" onClick={save}>Activate weights</button>
      </div>

      <div className="tuning-grid">
        <div>
          {Object.entries(weights).map(([name, value]) => (
            <label className="slider-row" key={name}>
              <span>{name}</span>
              <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => updateWeight(name, Number(event.target.value))} />
              <strong>{(normalized[name] ?? 0).toFixed(2)}</strong>
            </label>
          ))}
          <label className="slider-row">
            <span>diversity</span>
            <input type="range" min="0" max="0.4" step="0.01" value={diversityLambda} onChange={(event) => setDiversityLambda(Number(event.target.value))} />
            <strong>{diversityLambda.toFixed(2)}</strong>
          </label>
          <label className="slider-row">
            <span>exploration</span>
            <input type="range" min="0" max="0.4" step="0.01" value={explorationRate} onChange={(event) => setExplorationRate(Number(event.target.value))} />
            <strong>{explorationRate.toFixed(2)}</strong>
          </label>
        </div>

        <div>
          <div className="section-title">
            <h3>Preview ranking</h3>
            <span className="muted">normalized weights</span>
          </div>
          {(preview?.recommendations ?? []).map((row: any, index: number) => (
            <div className="candidate-row" key={row.item.id}>
              <span>{index + 1}</span>
              <strong>{row.item.title}</strong>
              <em>{Number(row.score).toFixed(2)}</em>
            </div>
          ))}
          {!preview ? <p className="muted">Run preview to see how the current sliders change the feed.</p> : null}
        </div>
      </div>
    </section>
  );
}

function normalize(weights: Record<string, number>) {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (!total) return Object.fromEntries(Object.keys(weights).map((key) => [key, 0]));
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / total]));
}
