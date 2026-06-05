# RecoLab API Documentation

Base URL: `http://localhost:4000`

Interactive local docs:

- `GET /docs`
- `GET /openapi.json`

## Production Hardening

Every response includes `X-Request-Id`. You can pass your own `x-request-id` header for traceability.

The API sets local security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy`
- `Content-Security-Policy`

The API also applies an in-memory local rate limit and returns `429` with `retryAfterSeconds` when exceeded. Defaults are controlled by `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`. Validation errors include `requestId` and normalized `issues`.

## Auth

- `POST /auth/login`
- Body: `{ "email": "ada@recolab.local", "password": "recolab-demo" }`
- Returns an access token, refresh token, refresh expiry, and user profile.
- `POST /auth/refresh`
- Body: `{ "refreshToken": "..." }`
- Rotates the refresh token and returns a new access token.
- `POST /auth/logout`
- Body: `{ "refreshToken": "..." }`
- Revokes the refresh token locally.
- `POST /auth/password-reset/request`
- Body: `{ "email": "ada@recolab.local" }`
- Local demo response includes a reset token instead of sending email.
- `POST /auth/password-reset/confirm`
- Body: `{ "resetToken": "...", "newPassword": "recolab-demo" }`
- Updates the password and revokes outstanding refresh tokens.
- `GET /auth/me`

Use the token as:

```txt
Authorization: Bearer <token>
```

## Users

- `GET /users`
- `GET /users/:id`
- `GET /users/:id/history`
- `GET /users/:id/privacy/export`
- `POST /users/:id/privacy/anonymize`
- `PATCH /users/:id/preferences`
- Body: `{ "preferredGenres": ["Sci-Fi"], "preferredSkills": ["systems"], "blockedGenres": ["Horror"], "boostedProviders": ["MovieLens demo"], "boostedTags": ["cyberpunk"], "personalExploration": 0.12 }`

Preference updates invalidate that user's cached recommendations. Blocked genres are filtered from candidate generation, boosted providers/tags add a personal score contribution, and personal exploration overrides the global exploration rate for serving.

Privacy export returns a local JSON snapshot of profile fields, ratings, interactions, recommendation results, and explanation metadata. Anonymization removes user-specific activity, revokes local auth/reset tokens, clears preference fields, and replaces personally identifying profile fields with a deleted-user tombstone.

## Items

- `GET /items`
- `GET /items?q=matrix&domain=movies&genre=Sci-Fi&tag=cyberpunk&yearFrom=1990&yearTo=2005&sort=newest&limit=24&offset=0`
- `GET /items/:id`
- `GET /items/:id/similar?k=6`

Search responses include `rows`, `total`, pagination fields, and catalog facets for domains, genres, and tags. Calling `/items` without query parameters preserves the plain array response used by older screens.

## Ratings

- `POST /ratings`
- Body: `{ "userId": "...", "itemId": "...", "rating": 4.5 }`

## Recommendations

- `GET /recommendations/:userId?algorithm=hybrid&k=8`
- `GET /recommendations/:userId/trace/:itemId?algorithm=hybrid&k=20`
- `GET /recommendations/:userId/trace/:itemId/export?algorithm=hybrid&k=20&format=json`
- `GET /recommendations/:userId/trace/:itemId/export?algorithm=hybrid&k=20&format=html`
- Algorithms: `popularity`, `content`, `collaborative`, `semantic`, `hybrid`
- Returns item, score, model version, reason codes, model contributions, cold-start status, and Ollama explanation text.

Trace endpoint returns pipeline stages, candidate preview, selected item score breakdown, feature-store values, semantic score, similar candidates, active model weights, diversity settings, and debug notes.

Trace export downloads the same explainability payload as formatted JSON or a standalone local HTML report suitable for recruiter walkthroughs. If the active trace policy uses `storage_mode: "local_file"`, the API also archives a copy under `TRACE_ARCHIVE_DIR` and returns the archived filename in `X-RecoLab-Trace-Archive`.

## Feedback

- `POST /feedback`
- Body: `{ "userId": "...", "itemId": "...", "action": "like" }`
- Actions: `like`, `dislike`, `save`

## Admin

Admin endpoints require an `admin` role JWT.

- `GET /admin/metrics`
- `GET /admin/observability`
- `GET /admin/observability/history?limit=60`
- `GET /admin/observability/alerts`
- `POST /admin/evaluate?k=5`
- `POST /admin/model-refresh`
- `POST /admin/feature-refresh`
- `POST /admin/embeddings/rebuild`
- `GET /admin/model-registry`
- `GET /admin/model-governance`
- `POST /admin/model-governance/:version/approve`
- `POST /admin/model-governance/:version/reject`
- `POST /admin/model-governance/:version/activate`
- `GET /admin/model-canaries`
- `POST /admin/model-canaries`
- `POST /admin/model-canaries/:id/action`
- `GET /admin/experiments`
- `GET /admin/queues`
- `GET /admin/data-quality`
- `GET /admin/drift-report`
- `GET /admin/privacy-audit`
- `GET /admin/trace-retention`
- `POST /admin/trace-retention/policy`
- `POST /admin/trace-retention/cleanup`
- `POST /admin/weights`
- `POST /admin/weights/preview`
- `POST /admin/model-comparison`
- `POST /admin/datasets/movielens`
- `GET /admin/explanation-logs`

Experiment reports include assigned users, event counts, positive/dislike rates, lift versus baseline variant A, relative lift, standard error, 95% confidence interval, significance label, and recommendation label.

Observability history returns persisted PostgreSQL snapshots with timers, counters, derived rates, capture time, and uptime. The admin dashboard uses it for local time-series charts.

Observability alerts evaluate local thresholds for API latency, recommendation latency, Ollama latency, cache hit rate, LLM fallback rate, and embedding fallback rate. Thresholds are configured through `ALERT_*` environment variables. Each alert includes a runbook list so the dashboard can show what to inspect before changing code.

Data quality reports include sparse users, cold-start items, domain and genre coverage, metadata gaps, and summary rates.

Privacy audit lists export and anonymization events with actor, target, metadata, and timestamp.

Drift report compares the recent 7-day window against a 30-day baseline for ratings, feedback rates, dislike rate, and recommendation score. Trace retention reports the active sampling policy, sampled trace counts, explanation log volume, and recommendation result volume. Cleanup removes records older than the configured retention window.

Model governance returns the approval queue and audit metadata for model versions. Batch scoring inserts new versions as pending candidates; admins can approve, reject, or activate them. Activating a model archives the previous active model and invalidates recommendation cache.

Canary rollouts simulate gradual traffic exposure for approved model versions. The report estimates deterministic user assignment, compares candidate and baseline metrics, and recommends expand, hold, rollback, or promote.

Canary actions also support `enable_live` and `disable_live`. When live routing is enabled, deterministically assigned users are served with the candidate model version label while non-assigned users remain on the active baseline. Candidate serving loads local JSON model artifacts when available, so canary traffic can use artifact-defined weights instead of only a label switch.

Feature drift baselines can be captured with `POST /admin/drift-report/baselines`. The drift report then includes feature-level deltas for user rating density, item popularity, item dislike rate, and missing genre coverage.

Trace retention policy also controls allowed export formats (`json`, `html`, or `both`), storage mode labels (`download_only` or `local_file`), and whether feature values remain present in exported traces.

MovieLens import body:

```json
{
  "sourceDir": "./data/ml-latest-small",
  "limitRatings": 20000
}
```

Weight config body:

```json
{
  "name": "semantic-heavy",
  "weights": {
    "popularity": 0.1,
    "content": 0.25,
    "collaborative": 0.25,
    "semantic": 0.4
  },
  "diversityLambda": 0.1,
  "explorationRate": 0.12
}
```

Weight preview body:

```json
{
  "userId": "11111111-1111-4111-8111-111111111111",
  "weights": {
    "popularity": 0.1,
    "content": 0.3,
    "collaborative": 0.2,
    "semantic": 0.4
  },
  "diversityLambda": 0.1,
  "explorationRate": 0.12,
  "k": 8
}
```

Model comparison body:

```json
{
  "userId": "11111111-1111-4111-8111-111111111111",
  "algorithms": ["hybrid", "semantic", "content", "collaborative", "popularity"],
  "k": 8
}
```

## AI

- `POST /ai/explanations`
- Body: `{ "userId": "...", "itemId": "...", "algorithm": "hybrid" }`
