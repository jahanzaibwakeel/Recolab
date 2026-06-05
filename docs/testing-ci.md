# Testing and CI

RecoLab uses a layered local test strategy:

- Unit and component tests run with Vitest.
- API route tests run with Supertest.
- Integration tests run against PostgreSQL and Valkey.
- Playwright runs the recruiter demo flow with mocked backend responses and captures desktop/mobile admin visual smoke screenshots as artifacts.

## Local Commands

Install dependencies first:

```bash
npm install
```

Run the normal verification suite:

```bash
npm run ci:verify
```

Run API integration tests locally after PostgreSQL and Valkey are available:

```powershell
$env:RUN_INTEGRATION_TESTS='1'
npm run test:integration
```

The project also includes a Docker-backed shortcut that starts PostgreSQL and Valkey on isolated host ports (`55432` and `56379` by default), runs migrations, enables integration tests, and executes the API integration suite:

```powershell
npm run test:docker:integration
```

Override ports when needed:

```powershell
$env:POSTGRES_HOST_PORT='55433'
$env:VALKEY_HOST_PORT='56380'
npm run test:docker:integration
```

For a full local compose rehearsal, run:

```powershell
docker compose up --build
```

Optional profiles are available for vector search and local object-storage rehearsal:

```powershell
docker compose --profile vector --profile storage up --build
```

The integration test seeds demo data, logs in as the admin user, checks catalog search, verifies hybrid recommendations, and confirms admin observability history is protected by RBAC.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes and pull requests. It provisions PostgreSQL and Valkey as service containers, installs dependencies, builds the workspace in dependency order, runs unit tests, runs integration tests, installs Chromium, and executes the Playwright demo flow with visual admin smoke coverage.

Playwright serves the built Next.js app during e2e runs, so run `npm run build` first when executing the e2e suite outside CI.
