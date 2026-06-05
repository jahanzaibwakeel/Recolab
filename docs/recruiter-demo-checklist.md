# Recruiter Demo Checklist

Use this walkthrough to show RecoLab quickly in an interview or portfolio review.

## 1. Recommendation Feed

- Open the feed.
- Switch between `hybrid`, `semantic`, `content`, `collaborative`, and `popularity`.
- Point out score contributions and generated explanations.

## 2. Explainability Trace

- Click the trace/debug button on a recommendation.
- Show pipeline stages, selected score breakdown, feature values, candidate preview, and similar candidates.
- Export JSON or the standalone HTML report.

## 3. Personalization

- Open Profile.
- Show preferred genres/skills, blocked genres, boosted providers, boosted tags, and personal exploration.
- Explain how blocked genres filter candidates and boosted tags add a personal score contribution.

## 4. Operations Dashboard

- Open Admin and log in with `ada@recolab.local` / `recolab-demo`.
- Show model metrics, observability history, alert thresholds, queue operations, model comparison, and dataset import.
- Open alert thresholds and point out runbooks: each alert says what to inspect before changing code.
- Open canary rollouts and explain live routing: assigned users can receive the candidate model loaded from a local artifact.
- Open trace retention and explain storage policy: exports can be downloaded only or archived locally.

## 5. Tradeoffs

- Explain that ranking is deterministic and measurable.
- Explain that Ollama only writes natural-language explanations from structured ranking facts.
- Explain that PostgreSQL stores state, Valkey handles cache/queues, and Qdrant is optional.
- Explain that MinIO is optional for storage rehearsal, while the default archive path stays local in `artifacts/trace-exports`.
