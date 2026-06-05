# RecoLab

RecoLab is an advanced local AI-integrated recommendation platform built with Next.js, Express, TypeScript, PostgreSQL, Valkey, Ollama, and optional Qdrant. It recommends movies, courses, jobs, or products using multiple algorithms and explains every recommendation with a local LLM.

## Stack

- Frontend: Next.js + React + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Cache and queue: Valkey + BullMQ
- AI integration: Ollama local LLM
- Optional vector database: Qdrant
- Charts: Recharts
- Testing: Vitest, Supertest, Playwright
- Containerization: Docker Compose

## Run Locally

```bash
docker compose up --build
```

Open:

- Web app: http://localhost:3000
- API health: http://localhost:4000/health
- API docs: http://localhost:4000/docs
- OpenAPI JSON: http://localhost:4000/openapi.json
- Ollama: http://localhost:11434
- Qdrant, optional profile: `docker compose --profile vector up`
- MinIO, optional local object storage profile: `docker compose --profile storage up`

Pull an Ollama model locally:

```bash
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull nomic-embed-text
```

The app still works before a model is pulled because explanations fall back to deterministic local text.

## Development

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Demo login:

```txt
Admin email: ada@recolab.local
Viewer email: maya@recolab.local
Password: recolab-demo
```

Batch scoring and evaluation:

```bash
npm run batch:score
```

Import a local MovieLens download:

```bash
npm run dataset:movielens -- ./data/ml-latest-small 20000
```

The admin dashboard also includes an import pipeline UI for local MovieLens paths.

Build semantic retrieval:

```bash
curl -X POST http://localhost:4000/admin/embeddings/rebuild ^
  -H "Content-Type: application/json" ^
  -d "{\"syncQdrant\":true}"
```

Tests:

```bash
npm test
npm run test:e2e -w @recolab/web
```

CI-style verification:

```bash
npm run ci:verify
```

Docker-backed integration test on Windows:

```powershell
npm run test:docker:integration
```

## Key Features

- User profiles and preferences
- Advanced personalization controls for blocked genres, boosted providers, boosted tags, and personal exploration
- JWT auth with admin/viewer roles
- Refresh-token rotation, logout revocation, and local password reset
- Production hardening with request IDs, security headers, structured validation errors, and local rate limiting
- Searchable item catalog with filters and facets
- Ratings and interactions
- Popularity, content-based, collaborative, and hybrid recommendations
- Ollama-generated explanations
- Similar items
- Cold-start handling
- Like, dislike, and save feedback
- PostgreSQL persistence
- Valkey recommendation cache
- Background model refresh jobs
- Precision@k, recall@k, MAP@k, NDCG
- Model versioning
- Model governance with approval, rejection, and activation workflow
- Canary rollout simulation for approved model versions
- Optional live-routing integration for running canary models
- Artifact-backed canary serving from local model JSON files
- Local embedding rebuilds
- Optional Qdrant semantic candidate generation
- Diversity and exploration-aware re-ranking
- A/B test simulation
- Explanation audit logs
- Privacy controls for user data export, anonymization, and admin audit review
- Explainability exports for recommendation traces as JSON or local HTML reports
- Local trace export archive policy under `artifacts/trace-exports`
- Recruiter-ready dashboard
- Durable observability for API latency, cache hit rate, AI fallback rate, and vector search latency
- Local alert thresholds for latency, cache health, and fallback rates
- Alert runbooks surfaced from the API and admin dashboard
- Data quality dashboard for sparse users, cold-start items, catalog coverage, and metadata gaps
- Drift monitoring for recent versus baseline ratings, feedback, and served recommendation scores
- Feature-level drift baselines for user/item feature health
- Trace sampling and retention controls for explainability logs
- Trace export policy controls for JSON/HTML availability and feature-value redaction

## Documentation

- [Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Testing and CI](docs/testing-ci.md)
- [Recruiter Demo Checklist](docs/recruiter-demo-checklist.md)
- [Final Demo Script](docs/final-demo-script.md)
- [Recruiter Case Study](docs/recruiter-case-study.md)
