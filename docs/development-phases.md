# RecoLab Development Phases

## Phase 0: Reset

The earlier FastAPI/Vite/Python scaffold was removed. RecoLab was rebuilt around the requested stack: Next.js, Express, TypeScript, PostgreSQL, Valkey, Ollama, optional Qdrant, Recharts, Vitest, Supertest, Playwright, and Docker Compose.

## Phase 1: Local Platform Foundation

This phase creates a runnable local platform. Docker Compose owns every external dependency so the project does not rely on paid APIs or cloud services.

Built:

- PostgreSQL for durable application state.
- Valkey for cache and queue coordination.
- Ollama for local LLM explanations.
- Qdrant behind an optional Docker profile.
- API, worker, and web app containers.
- Shared TypeScript contracts.

Why it matters: the project is reproducible for a recruiter, teammate, or hiring manager on a local machine.

## Phase 2: Data and Schema

The database schema models a real recommendation platform instead of a toy list.

Built:

- users,
- items,
- ratings,
- interactions,
- model versions,
- recommendation results,
- explanation logs,
- evaluations.

Why it matters: rankings, explanations, feedback, model versions, and evaluation results become auditable data.

## Phase 3: Recommendation Engine

The recommender is implemented in TypeScript so the Node backend can score locally without paid services.

Built:

- popularity ranking with smoothed averages,
- content-based ranking using tokenized metadata and profile vectors,
- collaborative filtering using neighbor similarity,
- hybrid strategy with weighted score blending,
- cold-start fallback through profile and popularity signals,
- similar item retrieval through attribute overlap.

Why it matters: each algorithm has a product role and a measurable tradeoff.

## Phase 4: AI Explanation System

Ollama generates explanations from structured ranking facts.

Built:

- prompt construction with reason codes,
- local LLM generation,
- deterministic fallback when Ollama has no model yet,
- explanation logging in PostgreSQL,
- UI explanation panel with model contributions.

Why it matters: the LLM explains decisions; it does not secretly make ranking decisions.

## Phase 5: Caching, Queueing, and Model Refresh

Valkey improves latency and BullMQ handles background work.

Built:

- recommendation response caching,
- cache invalidation after ratings and feedback,
- queued model refresh endpoint,
- scheduled worker refresh,
- batch scoring and evaluation job.

Why it matters: the architecture demonstrates production habits while staying local.

## Phase 6: Evaluation and Experimentation

Ranking quality is measured with top-k metrics.

Built:

- precision@k,
- recall@k,
- MAP@k,
- NDCG@k,
- model comparison endpoint,
- A/B test simulation.

Why it matters: the dashboard shows how different recommendation strategies behave, not just what they output.

## Phase 7: Recruiter-Ready Product UI

The frontend is designed as an operational dashboard.

Built:

- recommendation feed,
- feedback controls,
- item detail page,
- profile/preferences page,
- admin analytics dashboard,
- model comparison chart,
- A/B simulation panel,
- explanation logs.

Why it matters: the project demonstrates both ML system design and product thinking.

## Phase 8: Test and Verification Layer

The initial test suite covers deterministic logic and app wiring.

Built:

- recommendation metric tests,
- algorithm behavior tests,
- Express health test,
- React navigation render test,
- Playwright smoke test configuration.

Why it matters: the highest-risk deterministic pieces can be tested quickly before running the full Docker stack.

## Upgrade Phase 1: Real Dataset Ingestion

Added a local MovieLens importer for `movies.csv` and `ratings.csv`. It maps MovieLens users, items, and ratings into PostgreSQL with stable UUIDs, stores import audit rows, and refreshes features after ingestion.

## Upgrade Phase 2: Pipeline Architecture

Recommendation serving now runs through explicit stages:

- candidate generation,
- scoring,
- re-ranking.

Each recommendation can carry a pipeline trace so the UI can explain how many candidates survived each stage.

## Upgrade Phase 3: Feature Store-Lite

Added materialized `user_features` and `item_features` tables for rating counts, average ratings, popularity score, save rate, dislike rate, user genre scores, and recent activity.

## Upgrade Phase 4: Semantic Retrieval

Added local item embeddings with Ollama embedding models and deterministic hashed-vector fallback. Qdrant can be synced as an optional semantic candidate-generation service, while PostgreSQL-stored vectors keep the system runnable without Qdrant.

## Upgrade Phase 5: Diversity and Model Registry

Added semantic-heavy hybrid weights, active model weight configs, diversity-aware re-ranking, exploration boosts, and admin UI panels for model registry and embedding status.

## Upgrade Phase 6: Persistent Experiment Tracking

Added local experiment tables for experiments, variants, deterministic user assignments, and experiment events. Feedback actions now log experiment events so the admin dashboard can compare positive and negative rates by variant.

## Power Upgrade 1: JWT Auth and RBAC

Added bcrypt password hashing, signed JWTs, `/auth/login`, `/auth/me`, admin/viewer roles, and admin-only route protection. Demo users keep local convenience through the shared password `recolab-demo`.

## Power Upgrade 2: OpenAPI Documentation

Added a dependency-light OpenAPI document served at `/openapi.json` and a local API docs viewer at `/docs`. The docs include auth, recommendation, feedback, semantic, experiment, and admin endpoints.

## Power Upgrade 3: Observability Metrics

Added in-process metrics for API latency, recommendation latency, cache hit/miss rate, Ollama explanation latency and fallback rate, embedding fallback rate, Qdrant latency, and semantic local-search latency. The admin dashboard now includes an observability panel and request counters.

## Power Upgrade 4: Recommendation Trace Debugger Backend

Added `/recommendations/:userId/trace/:itemId`, which returns the serving-context trace for a recommendation: pipeline stages, candidate preview, selected score breakdown, feature-store values, semantic score, active weights, diversity settings, similar candidates, and debug notes.

## Power Upgrade 5: Frontend Recommendation Debugger Modal

Added a trace debugger modal to recommendation cards. It fetches the trace endpoint and visualizes pipeline stages, score breakdown, feature-store values, semantic score, candidate preview, and similar candidates.

## Power Upgrade 6: Weight Tuning Playground

Added an admin playground with sliders for popularity, content, collaborative, semantic, diversity, and exploration. Admins can preview hybrid rankings with temporary weights and activate a saved weight config.

## Power Upgrade 7: Model Comparison Studio

Added `/admin/model-comparison` and a dashboard studio that compares algorithms side by side. It shows top recommendations, average score, diversity ratio, contribution averages, pairwise overlap, and interpretation notes.

## Power Upgrade 8: Experiment Confidence and Lift Analytics

Experiment reporting now calculates lift versus baseline, relative lift, standard error, 95% confidence interval, significance label, and practical recommendation labels such as `collect more data`, `promote variant`, or `keep baseline`.

## Power Upgrade 9: Import Pipeline UI

Added an admin import panel for local MovieLens ingestion. Admins can enter a dataset path and rating limit, import only, or run the full pipeline: import, feature refresh, embedding rebuild, and evaluation.

## Power Upgrade 10: Full Playwright Demo Flow

Expanded Playwright into a recruiter demo flow with mocked backend responses. The flow covers the feed, recommendation trace debugger, admin login, observability, weight preview, model comparison, and dataset import UI.

## Production Ops Round 1: Queue Operations Dashboard

Added `/admin/queues` and an admin dashboard panel for BullMQ/Valkey model-refresh jobs. It shows waiting, active, completed, failed, delayed, and paused counts, recent jobs, failure reasons, and a control to enqueue model refresh.

## Product Depth Round 1: Saved Items and User History

Added `/users/:id/history` and a History page for saved items, recent interactions, ratings, and served recommendation history. The endpoint is protected by self-or-admin RBAC.

## Product Depth Round 2: Catalog Search and Filtering

Added searchable `/items` query support with domain, genre, tag, year, sort, limit, and offset parameters. The frontend now has a Catalog Explorer with filter controls, facet chips, and item cards that link into the existing item detail and similar-items flow.

## Security Round 1: Refresh Tokens and Local Password Reset

Added database-backed refresh tokens with rotation, logout revocation, automatic frontend refresh-on-401, and a fully local password-reset simulation. Reset tokens are returned directly in the local demo response so the project remains free and runnable without email providers.

## Observability Round 1: Durable Metrics History

Added PostgreSQL-backed observability snapshots and `/admin/observability/history`. The API persists live timer/counter/derived metric snapshots on startup and on a schedule, while the admin dashboard now charts API latency, recommendation latency, Ollama latency, cache hit rate, and LLM fallback rate over time.

## Delivery Round 1: CI and Integration Pipeline

Added a GitHub Actions workflow with PostgreSQL and Valkey service containers, deterministic workspace build ordering, unit tests, API integration tests, and the Playwright recruiter demo flow. Integration tests seed demo data and verify login, catalog search, hybrid recommendations, and RBAC-protected observability history.

## Product Depth Round 3: Advanced Personalization Controls

Added user-level blocked genres, boosted providers, boosted tags, and personal exploration. The recommender now applies an explicit personalization filter stage, adds personal boost contributions and reason codes during scoring, overrides global exploration per user, and invalidates recommendation cache after preference edits.

## Explainability Round 1: Trace Export Reports

Added `/recommendations/:userId/trace/:itemId/export` for downloadable JSON and standalone local HTML reports. The debugger modal now includes export controls so ranking evidence, score contributions, feature values, pipeline stages, and candidate previews can be shared outside the app.

## Production Hardening Round 1: API Security Middleware

Added request IDs, security headers, local in-memory rate limiting, and normalized validation-error responses. The API now returns traceable error payloads with `requestId` and sanitized Zod issue fields, while tests assert the hardening headers and validation shape.

## Observability Round 2: Alert Thresholds

Added `/admin/observability/alerts` with local threshold rules for API latency, recommendation latency, Ollama latency, cache hit rate, LLM fallback rate, and embedding fallback rate. The admin dashboard now summarizes alert status and shows per-rule threshold checks.

## Demo Polish Round 1: Guided Recruiter Walkthrough

Added a first-screen guided demo panel with checklist state and links to the feed, profile, and admin dashboard. Added `docs/recruiter-demo-checklist.md` so the project can be presented as a tight interview walkthrough instead of an unstructured app tour.

## Data Quality Round 1: Coverage and Cold-Start Dashboard

Added `/admin/data-quality` and an admin panel for sparse users, cold-start items, domain coverage, genre coverage, and metadata gaps. This helps diagnose whether poor recommendations come from model choice or from thin catalog/interaction data.

## MLOps Round 1: Model Governance Approval

Added governance columns to `model_versions`, `/admin/model-governance`, and admin actions to approve, reject, or activate a model version. Batch scoring now creates a pending candidate instead of automatically replacing the active model, which demonstrates controlled model promotion and an auditable release workflow.

## Trust Round 1: Privacy Controls and Data Lifecycle

Added user data export, local anonymization, auth-token revocation, user activity deletion, and a privacy audit table. The profile page now has data export/deletion controls, while the admin dashboard shows privacy audit events for recruiter-ready discussion of responsible data handling.

## MLOps Round 2: Canary Rollout Simulation

Added `model_canary_rollouts`, `/admin/model-canaries`, and a canary rollout dashboard. Admins can start a rollout for an approved candidate model, simulate assigned users by traffic percentage, inspect guardrail deltas against the active baseline, and expand, pause, rollback, or mark the rollout promoted.

## MLOps Round 3: Drift Monitoring

Added `/admin/drift-report` and an admin drift panel comparing recent activity against a baseline window. It watches average rating, positive feedback rate, dislike rate, and served recommendation score so model quality problems can be discussed as data movement, not just subjective UX.

## Explainability Ops Round 1: Trace Sampling and Retention

Added trace retention policy storage, sampled trace access events, `/admin/trace-retention`, policy updates, and cleanup controls. Trace views and exports are sampled deterministically, while old sampled trace events, explanation logs, and recommendation results can be cleaned up by retention days.

## Delivery Round 2: Visual Admin Smoke Coverage

Expanded Playwright coverage with desktop and mobile admin screenshots attached as test artifacts. The smoke flow verifies that operational panels for drift, trace retention, canaries, governance, queues, and privacy render in realistic viewport sizes.

## MLOps Round 4: Optional Live Canary Routing

Added live-routing controls to canary rollouts. Running canaries can be kept in simulation mode or enabled for deterministic user assignment; assigned users receive the candidate model version label while the rest continue using the active baseline.

## MLOps Round 5: Feature-Level Drift Baselines

Added captured drift baselines for feature-store health: average user rating count, average item popularity, average item dislike rate, and missing genre item count. Admins can capture current baselines and then compare future current values against those baselines.

## Explainability Ops Round 2: Production-Style Trace Policy

Extended trace retention policy with export format controls, storage-mode labels, and feature-value redaction. Trace exports now respect the active policy, allowing local governance over what evidence can be downloaded.
