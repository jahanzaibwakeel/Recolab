# Recruiter Case Study: RecoLab

## Problem

RecoLab is a local-first recommendation system that can recommend movies, courses, jobs, or products. It demonstrates how to combine classic recommender algorithms with local AI explanations while staying fully open-source and runnable on a laptop.

## Recommendation Algorithms

**Popularity baseline** ranks by a Bayesian-smoothed rating score. It is simple, stable, and useful for cold-start users, but it is weakly personalized.

**Content-based ranking** builds a profile from liked items and user preferences, then compares candidate item metadata. It is explainable and works for new items, but it can over-specialize around metadata.

**Collaborative filtering** uses user-neighbor behavior to recommend items liked by similar users. It discovers preference patterns not present in metadata, but needs interaction density.

**Hybrid ranking** blends popularity, content, and collaborative scores. The blend is transparent through model contribution fields, which makes tradeoffs visible in the UI.

## AI Explanation Design

RecoLab does not let the LLM decide the ranking. The ranking engine produces structured reason codes, matched attributes, cold-start flags, and contribution scores. Ollama turns those facts into natural-language explanations. This keeps the system measurable while making explanations readable.

## Caching and Queueing

Valkey caches recommendation responses using keys scoped by user, algorithm, and `k`. Ratings and feedback invalidate the affected user cache. BullMQ uses Valkey to run background model refresh and batch scoring jobs without blocking API requests.

## Evaluation

The evaluation service compares algorithms with:

- precision@k,
- recall@k,
- MAP@k,
- NDCG@k.

These are top-k ranking metrics, which fit the product goal better than rating-prediction error alone.

## Model Versioning

Each batch scoring run creates a pending `model_versions` row with algorithm weights, metrics, and artifact path. Admins approve, reject, or activate versions through the governance panel, and recommendation results store the active model version used at serving time.

## Tradeoffs

The upgraded implementation includes a MovieLens importer, feature store-lite, staged recommendation pipeline, local embeddings, optional Qdrant semantic retrieval, diversity-aware re-ranking, model registry/governance with canary simulation and optional live routing, privacy export/anonymization controls, drift monitoring with feature baselines, trace sampling/retention/export policy controls, persistent experiment tracking, and durable observability snapshots. For production scale, the natural next steps are streaming interaction ingestion, real artifact loading for canary models, external object storage policies, and richer alert routing.

The delivery layer now includes CI with PostgreSQL and Valkey service containers, deterministic workspace builds, API integration tests, Playwright recruiter flows, and admin visual smoke screenshots. That makes the project easier to evaluate because reviewers can see both algorithm behavior and operational wiring checked automatically.

User personalization now has both positive and negative controls. Preferred genres and skills help cold-start and content ranking, blocked genres prevent unwanted candidates, boosted providers/tags express business or user affinity, and personal exploration lets a user choose how much long-tail discovery they want. The trace pipeline exposes this as a real filtering/scoring stage rather than hiding it inside a black-box ranker.

Explainability exports make the system auditable beyond the UI. A recruiter or reviewer can download the exact trace as JSON for technical inspection or as a standalone HTML report for a product-facing walkthrough.

Production hardening is intentionally local and dependency-light: request IDs make failures traceable, security headers reduce common browser risks, local rate limiting protects demo endpoints from accidental abuse, and structured validation errors make API failures easier to debug.

Alert thresholds turn observability into action. Rather than only showing metrics, RecoLab evaluates local rules for latency, cache effectiveness, and AI fallback rates so an operator can quickly see whether the recommendation platform is healthy.

The guided demo mode turns the project into a reviewer-friendly story: recommendations first, then explainability, personalization, operations, and tradeoffs. This helps show full-stack product thinking instead of only showing isolated features.

The data quality dashboard separates model performance from data readiness. Sparse users and unrated items are surfaced directly, making it easier to explain cold-start behavior and decide whether to collect interactions, enrich metadata, or adjust ranking strategy.
