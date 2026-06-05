"use client";

import { Activity, Database, Download, FileJson, GitBranch, Search, X } from "lucide-react";
import type { RecommendationAlgorithm } from "@recolab/shared";
import { RecoApi } from "../lib/api";

export function RecommendationDebuggerModal({
  trace,
  loading,
  userId,
  algorithm,
  onClose
}: {
  trace: any;
  loading: boolean;
  userId: string;
  algorithm: RecommendationAlgorithm;
  onClose: () => void;
}) {
  function download(format: "json" | "html") {
    if (!trace?.item?.id) return;
    window.location.href = RecoApi.recommendationTraceExportUrl(userId, trace.item.id, algorithm, format);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="debug-modal" role="dialog" aria-modal="true" aria-label="Recommendation trace debugger">
        <div className="section-title">
          <div>
            <p className="eyebrow">Recommendation trace</p>
            <h2>{trace?.item?.title ?? "Loading debugger"}</h2>
          </div>
          <div className="actions">
            <button className="icon-button" title="Export JSON" disabled={!trace || loading} onClick={() => download("json")}><FileJson size={17} /></button>
            <button className="icon-button" title="Export HTML report" disabled={!trace || loading} onClick={() => download("html")}><Download size={17} /></button>
            <button className="icon-button" title="Close" onClick={onClose}><X size={17} /></button>
          </div>
        </div>

        {loading ? <p className="muted">Loading trace from the serving pipeline.</p> : null}

        {!loading && trace ? (
          <>
            <div className="metric-strip">
              <div className="metric"><span>Algorithm</span><strong>{trace.algorithm}</strong></div>
              <div className="metric"><span>Semantic score</span><strong>{Number(trace.featureValues?.semanticScore ?? 0).toFixed(2)}</strong></div>
              <div className="metric"><span>Diversity</span><strong>{Number(trace.diversityLambda ?? 0).toFixed(2)}</strong></div>
              <div className="metric"><span>Exploration</span><strong>{Number(trace.explorationRate ?? 0).toFixed(2)}</strong></div>
            </div>

            <section className="debug-grid">
              <article className="panel">
                <div className="section-title">
                  <h3><GitBranch size={16} /> Pipeline</h3>
                  <span className="muted">{trace.modelVersion}</span>
                </div>
                {(trace.pipeline ?? []).map((stage: any) => (
                  <div className="trace-step" key={stage.stage}>
                    <strong>{stage.stage}</strong>
                    <span>{stage.inputCount} in - {stage.outputCount} out</span>
                    <p className="muted">{(stage.notes ?? []).join(" ")}</p>
                  </div>
                ))}
              </article>

              <article className="panel">
                <div className="section-title">
                  <h3><Activity size={16} /> Score Breakdown</h3>
                  <span className="score">{trace.selectedCandidate?.score ?? "not selected"}</span>
                </div>
                {trace.selectedCandidate ? (
                  <>
                    <div className="chips">
                      {Object.entries(trace.selectedCandidate.modelContributions ?? {}).map(([name, value]) => (
                        <span className="chip" key={name}>{name}: {Number(value).toFixed(2)}</span>
                      ))}
                    </div>
                    <p className="muted">Matched: {(trace.selectedCandidate.matchedAttributes ?? []).join(", ") || "no direct profile attributes"}</p>
                    <p className="muted">Reasons: {(trace.selectedCandidate.reasonCodes ?? []).join(", ")}</p>
                  </>
                ) : (
                  <p className="muted">This item did not survive the current algorithm and k-window.</p>
                )}
              </article>
            </section>

            <section className="debug-grid">
              <article className="panel">
                <div className="section-title">
                  <h3><Database size={16} /> Feature Values</h3>
                  <span className="muted">feature store-lite</span>
                </div>
                <pre className="debug-json">{JSON.stringify(trace.featureValues, null, 2)}</pre>
              </article>

              <article className="panel">
                <div className="section-title">
                  <h3><Search size={16} /> Candidate Preview</h3>
                  <span className="muted">top 10</span>
                </div>
                {(trace.candidatePreview ?? []).map((candidate: any, index: number) => (
                  <div className="candidate-row" key={candidate.itemId}>
                    <span>{index + 1}</span>
                    <strong>{candidate.title}</strong>
                    <em>{Number(candidate.score).toFixed(2)}</em>
                  </div>
                ))}
              </article>
            </section>

            <section className="panel">
              <div className="section-title">
                <h3>Similar Candidates</h3>
                <span className="muted">attribute overlap</span>
              </div>
              <div className="chips">
                {(trace.similarCandidates ?? []).map((candidate: any) => (
                  <span className="chip" key={candidate.itemId}>{candidate.title}: {candidate.overlapCount}</span>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </div>
  );
}
