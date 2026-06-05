import type { RecommendationAlgorithm } from "@recolab/shared";
import { recommendationTrace } from "./traceService.js";

export async function recommendationTraceExport(userId: string, itemId: string, algorithm: RecommendationAlgorithm, k: number, format: "json" | "html", includeFeatureValues = true) {
  const trace = await recommendationTrace(userId, itemId, algorithm, k);
  if (!includeFeatureValues) {
    (trace as any).featureValues = { redacted: true };
  }
  if (format === "json") return { body: JSON.stringify(trace, null, 2), contentType: "application/json", extension: "json" };
  return { body: renderTraceHtml(trace), contentType: "text/html; charset=utf-8", extension: "html" };
}

function renderTraceHtml(trace: any) {
  const selected = trace.selectedCandidate;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RecoLab Trace - ${escapeHtml(trace.item?.title ?? "Recommendation")}</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, sans-serif; color: #171a1f; background: #fbfaf6; }
      header { background: #13231f; color: #f8f4ea; padding: 28px; }
      main { max-width: 1040px; margin: 0 auto; padding: 24px; }
      section { background: #fff; border: 1px solid #ddd8cb; border-radius: 8px; padding: 16px; margin: 12px 0; }
      h1, h2, h3, p { margin-top: 0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .metric { border: 1px solid #ddd8cb; border-radius: 7px; padding: 12px; }
      .metric span { color: #66706c; display: block; font-size: 13px; }
      .metric strong { color: #24745a; font-size: 22px; }
      .chip { display: inline-block; border: 1px solid #ddd8cb; border-radius: 999px; padding: 4px 8px; margin: 3px; font-size: 13px; }
      pre { white-space: pre-wrap; background: #13231f; color: #f8f4ea; padding: 14px; border-radius: 7px; overflow: auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; border-bottom: 1px solid #ddd8cb; padding: 8px; }
    </style>
  </head>
  <body>
    <header>
      <p>RecoLab Explainability Export</p>
      <h1>${escapeHtml(trace.item?.title ?? "Recommendation Trace")}</h1>
      <p>${escapeHtml(trace.algorithm)} - ${escapeHtml(trace.modelVersion)} - ${new Date().toISOString()}</p>
    </header>
    <main>
      <section class="grid">
        ${metric("Algorithm", trace.algorithm)}
        ${metric("Score", selected?.score ?? "not selected")}
        ${metric("Semantic score", Number(trace.featureValues?.semanticScore ?? 0).toFixed(2))}
        ${metric("Exploration", Number(trace.explorationRate ?? 0).toFixed(2))}
      </section>

      <section>
        <h2>Why This Recommendation?</h2>
        <p>${escapeHtml((selected?.reasonCodes ?? []).join(", ") || "The item was not selected in the current k-window.")}</p>
        <div>${(selected?.matchedAttributes ?? []).map((value: string) => `<span class="chip">${escapeHtml(value)}</span>`).join("")}</div>
      </section>

      <section>
        <h2>Score Breakdown</h2>
        <div>${Object.entries(selected?.modelContributions ?? {}).map(([key, value]) => `<span class="chip">${escapeHtml(key)}: ${Number(value).toFixed(2)}</span>`).join("")}</div>
      </section>

      <section>
        <h2>Pipeline</h2>
        <table>
          <thead><tr><th>Stage</th><th>Input</th><th>Output</th><th>Notes</th></tr></thead>
          <tbody>
            ${(trace.pipeline ?? []).map((stage: any) => `<tr><td>${escapeHtml(stage.stage)}</td><td>${stage.inputCount}</td><td>${stage.outputCount}</td><td>${escapeHtml((stage.notes ?? []).join(" "))}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Feature Values</h2>
        <pre>${escapeHtml(JSON.stringify(trace.featureValues, null, 2))}</pre>
      </section>

      <section>
        <h2>Candidate Preview</h2>
        <table>
          <thead><tr><th>Rank</th><th>Title</th><th>Score</th><th>Reasons</th></tr></thead>
          <tbody>
            ${(trace.candidatePreview ?? []).map((candidate: any, index: number) => `<tr><td>${index + 1}</td><td>${escapeHtml(candidate.title)}</td><td>${Number(candidate.score).toFixed(2)}</td><td>${escapeHtml((candidate.reasonCodes ?? []).join(", "))}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;
}

function metric(label: string, value: unknown) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char] ?? char));
}
