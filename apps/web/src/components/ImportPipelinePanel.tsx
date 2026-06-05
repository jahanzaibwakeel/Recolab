"use client";

import { useState } from "react";
import { DatabaseZap } from "lucide-react";
import { RecoApi } from "../lib/api";

export function ImportPipelinePanel({ onComplete }: { onComplete: () => void }) {
  const [sourceDir, setSourceDir] = useState("./data/ml-latest-small");
  const [limitRatings, setLimitRatings] = useState(20000);
  const [status, setStatus] = useState("Import MovieLens, refresh features, rebuild embeddings, then evaluate.");
  const [lastResult, setLastResult] = useState<any>(null);

  async function runImport() {
    setStatus("Importing MovieLens dataset");
    const result = await RecoApi.importMovieLens({ sourceDir, limitRatings });
    setLastResult(result);
    setStatus("Import complete");
    onComplete();
  }

  async function runFullPipeline() {
    setStatus("Running full import pipeline");
    const imported = await RecoApi.importMovieLens({ sourceDir, limitRatings });
    setStatus("Refreshing features");
    await RecoApi.refreshFeatures();
    setStatus("Rebuilding embeddings");
    await RecoApi.rebuildEmbeddings();
    setStatus("Running evaluation");
    const evaluation = await RecoApi.evaluate();
    setLastResult({ imported, evaluation });
    setStatus("Full pipeline complete");
    onComplete();
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Dataset operations</p>
          <h3><DatabaseZap size={16} /> Import Pipeline UI</h3>
        </div>
        <span className="muted">{status}</span>
      </div>

      <div className="toolbar">
        <input className="input wide-input" value={sourceDir} onChange={(event) => setSourceDir(event.target.value)} aria-label="MovieLens source directory" />
        <input className="input number-input" type="number" value={limitRatings} onChange={(event) => setLimitRatings(Number(event.target.value))} aria-label="Rating limit" />
        <button className="select" onClick={runImport}>Import only</button>
        <button className="select" onClick={runFullPipeline}>Run full pipeline</button>
      </div>

      {lastResult ? <pre className="debug-json" style={{ marginTop: 12 }}>{JSON.stringify(lastResult, null, 2)}</pre> : null}
    </section>
  );
}

