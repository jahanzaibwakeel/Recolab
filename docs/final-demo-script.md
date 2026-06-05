# RecoLab Final Demo Script

Use this as the polished 8-10 minute walkthrough.

## Opening

RecoLab is a local-first recommendation platform. The ranking engine is deterministic and measurable; Ollama only converts structured ranking facts into readable explanations. Everything runs with free/open-source tools.

## Flow

1. Start on the feed and switch between hybrid, semantic, content, collaborative, and popularity recommendations.
2. Open "why this recommendation" and show reason codes, contribution scores, candidate stages, and JSON/HTML trace export.
3. Open the profile page and show blocked genres, boosted providers/tags, and exploration controls.
4. Open Admin and sign in as `ada@recolab.local` with `recolab-demo`.
5. Show evaluation metrics: precision@k, recall@k, MAP@k, and NDCG.
6. Show observability: API latency, recommendation latency, Ollama latency, cache hit rate, fallback rate, and alert runbooks.
7. Show model governance: batch scoring creates a pending model version with a local artifact, then admins approve or activate it.
8. Show canary rollout: live routing deterministically assigns users and loads artifact-defined candidate weights.
9. Show drift and data quality: sparse users, cold-start items, feature-level baselines, and recent-vs-baseline drift.
10. Show trace retention: choose JSON/HTML policy, redact feature values, and archive exports locally.

## Closing Tradeoffs

- LLMs are used for explanation text, not ranking decisions.
- PostgreSQL stores durable state; Valkey accelerates cache/queue paths.
- Qdrant and MinIO are optional local profiles, so the core app remains runnable without extra services.
- Canary and drift controls are intentionally local and deterministic, which makes the project easy to test and explain.

## Final Verification Commands

```powershell
npm run build
npm test
npm run build -w @recolab/web
npm run test:e2e -w @recolab/web
```

For service-backed integration rehearsal:

```powershell
npm run test:docker:integration
```
