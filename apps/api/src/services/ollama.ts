import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { incrementMetric, observeDuration } from "../observability/metrics.js";
import type { RecommendationCandidate } from "../recommender/types.js";

export async function generateExplanation(userId: string, candidate: RecommendationCandidate, recommendationId?: string) {
  const prompt = [
    "You are RecoLab, a local recommendation assistant.",
    "Explain in two concise sentences why this item was recommended.",
    "Avoid hype. Mention concrete matched signals and algorithm tradeoffs.",
    `Item: ${candidate.item.title}`,
    `Description: ${candidate.item.description}`,
    `Reason codes: ${candidate.reasonCodes.join(", ")}`,
    `Matched attributes: ${candidate.matchedAttributes.join(", ") || "none"}`,
    `Model contributions: ${JSON.stringify(candidate.modelContributions)}`,
    `Cold start: ${candidate.coldStart}`
  ].join("\n");

  const started = performance.now();
  let responseText = fallbackExplanation(candidate);
  let usedFallback = true;
  incrementMetric("ollama.explanation.total");
  try {
    const response = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(config.ollamaTimeoutMs),
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.25, num_predict: 90 }
      })
    });
    if (response.ok) {
      const data = await response.json() as { response?: string };
      responseText = data.response?.trim() || responseText;
      usedFallback = !data.response?.trim();
    }
  } catch {
    responseText = `${responseText} Ollama was unavailable, so RecoLab used a deterministic local explanation.`;
  }
  const latencyMs = Math.round(performance.now() - started);
  observeDuration("ollama_explanation", latencyMs);
  incrementMetric(usedFallback ? "ollama.explanation.fallback" : "ollama.explanation.success");

  await query(
    `INSERT INTO explanation_logs(id, recommendation_id, user_id, item_id, prompt, response, model, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [randomUUID(), recommendationId ?? null, userId, candidate.item.id, prompt, responseText, config.ollamaModel, latencyMs]
  );

  return responseText;
}

function fallbackExplanation(candidate: RecommendationCandidate) {
  const matched = candidate.matchedAttributes.length
    ? `It matches ${candidate.matchedAttributes.join(", ")} from the profile.`
    : "It ranks well based on available catalog and behavior signals.";
  const contribution = Object.entries(candidate.modelContributions)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => `${name} ${score.toFixed(2)}`)
    .join(", ");
  return `${matched} The ranking used ${contribution}${candidate.coldStart ? " with a cold-start fallback." : "."}`;
}
