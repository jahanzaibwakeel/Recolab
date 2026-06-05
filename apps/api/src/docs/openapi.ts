export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "RecoLab API",
    version: "0.2.0",
    description: "Local AI-integrated recommendation platform API with JWT auth, recommendations, semantic retrieval, experiments, and admin operations."
  },
  servers: [{ url: "http://localhost:4000" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          requestId: { type: "string" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                message: { type: "string" },
                code: { type: "string" }
              }
            }
          }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "ada@recolab.local" },
          password: { type: "string", example: "recolab-demo" }
        }
      },
      RefreshRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: { refreshToken: { type: "string" } }
      },
      PasswordResetRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", example: "ada@recolab.local" } }
      },
      PasswordResetConfirmRequest: {
        type: "object",
        required: ["resetToken", "newPassword"],
        properties: {
          resetToken: { type: "string" },
          newPassword: { type: "string", minLength: 8, example: "recolab-demo" }
        }
      },
      FeedbackRequest: {
        type: "object",
        required: ["userId", "itemId", "action"],
        properties: {
          userId: { type: "string", format: "uuid" },
          itemId: { type: "string", format: "uuid" },
          action: { type: "string", enum: ["like", "dislike", "save"] }
        }
      },
      RatingRequest: {
        type: "object",
        required: ["userId", "itemId", "rating"],
        properties: {
          userId: { type: "string", format: "uuid" },
          itemId: { type: "string", format: "uuid" },
          rating: { type: "number", minimum: 0, maximum: 5 }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["system"],
        security: [],
        summary: "Health check",
        responses: { "200": { description: "API is healthy" } }
      }
    },
    "/auth/login": {
      post: {
        tags: ["auth"],
        security: [],
        summary: "Login with local credentials",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: { "200": { description: "JWT and user profile" }, "401": { description: "Invalid credentials" } }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["auth"],
        security: [],
        summary: "Rotate a refresh token and issue a new JWT",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshRequest" } } }
        },
        responses: { "200": { description: "New JWT, rotated refresh token, and user profile" }, "401": { description: "Invalid or expired refresh token" } }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["auth"],
        security: [],
        summary: "Revoke a local refresh token",
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshRequest" } } }
        },
        responses: { "200": { description: "Refresh token revoked" } }
      }
    },
    "/auth/password-reset/request": {
      post: {
        tags: ["auth"],
        security: [],
        summary: "Create a local demo password-reset token",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PasswordResetRequest" } } }
        },
        responses: { "200": { description: "Local reset token generated when the user exists" } }
      }
    },
    "/auth/password-reset/confirm": {
      post: {
        tags: ["auth"],
        security: [],
        summary: "Use a local reset token to update a password",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PasswordResetConfirmRequest" } } }
        },
        responses: { "200": { description: "Password updated and refresh tokens revoked" }, "400": { description: "Invalid or expired reset token" } }
      }
    },
    "/auth/me": {
      get: {
        tags: ["auth"],
        summary: "Current authenticated user",
        responses: { "200": { description: "User profile" }, "401": { description: "Missing or invalid token" } }
      }
    },
    "/users": {
      get: {
        tags: ["users"],
        security: [],
        summary: "List user profiles",
        responses: { "200": { description: "Users" } }
      }
    },
    "/users/{id}/preferences": {
      patch: {
        tags: ["users"],
        summary: "Update preferences as self or admin",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  preferredGenres: { type: "array", items: { type: "string" } },
                  preferredSkills: { type: "array", items: { type: "string" } },
                  blockedGenres: { type: "array", items: { type: "string" } },
                  boostedProviders: { type: "array", items: { type: "string" } },
                  boostedTags: { type: "array", items: { type: "string" } },
                  personalExploration: { type: "number", minimum: 0, maximum: 0.4 }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Updated user" }, "403": { description: "Insufficient role" } }
      }
    },
    "/users/{id}/history": {
      get: {
        tags: ["users"],
        summary: "Saved items, interactions, ratings, and recommendation history",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "User history" }, "403": { description: "Self or admin required" } }
      }
    },
    "/users/{id}/privacy/export": {
      get: {
        tags: ["users", "privacy"],
        summary: "Export a user's local profile, ratings, interactions, recommendations, and explanation metadata",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Portable user data export" }, "403": { description: "Self or admin required" } }
      }
    },
    "/users/{id}/privacy/anonymize": {
      post: {
        tags: ["users", "privacy"],
        summary: "Anonymize profile fields and delete user-specific activity data locally",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "User data anonymized" }, "403": { description: "Self or admin required" } }
      }
    },
    "/items": {
      get: {
        tags: ["items"],
        security: [],
        summary: "List or search catalog items",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search title, description, provider, genres, and tags" },
          { name: "domain", in: "query", schema: { type: "string", enum: ["movies", "courses", "jobs", "products"] } },
          { name: "genre", in: "query", schema: { type: "string" } },
          { name: "tag", in: "query", schema: { type: "string" } },
          { name: "yearFrom", in: "query", schema: { type: "integer" } },
          { name: "yearTo", in: "query", schema: { type: "integer" } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["title", "newest", "oldest", "provider"], default: "title" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 24 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } }
        ],
        responses: { "200": { description: "Items" } }
      }
    },
    "/recommendations/{userId}": {
      get: {
        tags: ["recommendations"],
        security: [],
        summary: "Get recommendations",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "algorithm", in: "query", schema: { type: "string", enum: ["popularity", "content", "collaborative", "semantic", "hybrid"], default: "hybrid" } },
          { name: "k", in: "query", schema: { type: "integer", default: 8 } }
        ],
        responses: { "200": { description: "Ranked recommendations with explanations" } }
      }
    },
    "/recommendations/{userId}/trace/{itemId}": {
      get: {
        tags: ["recommendations"],
        security: [],
        summary: "Trace a recommendation decision",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "itemId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "algorithm", in: "query", schema: { type: "string", enum: ["popularity", "content", "collaborative", "semantic", "hybrid"], default: "hybrid" } },
          { name: "k", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: { "200": { description: "Pipeline trace, feature values, score breakdown, and candidate preview" } }
      }
    },
    "/recommendations/{userId}/trace/{itemId}/export": {
      get: {
        tags: ["recommendations"],
        security: [],
        summary: "Export a recommendation trace as JSON or local HTML report",
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "itemId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "algorithm", in: "query", schema: { type: "string", enum: ["popularity", "content", "collaborative", "semantic", "hybrid"], default: "hybrid" } },
          { name: "k", in: "query", schema: { type: "integer", default: 20 } },
          { name: "format", in: "query", schema: { type: "string", enum: ["json", "html"], default: "json" } }
        ],
        responses: { "200": { description: "Downloadable trace export" } }
      }
    },
    "/feedback": {
      post: {
        tags: ["feedback"],
        security: [],
        summary: "Record recommendation feedback",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/FeedbackRequest" } } }
        },
        responses: { "201": { description: "Feedback recorded" } }
      }
    },
    "/ratings": {
      post: {
        tags: ["ratings"],
        security: [],
        summary: "Create or update a rating",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RatingRequest" } } }
        },
        responses: { "201": { description: "Rating recorded" } }
      }
    },
    "/admin/metrics": {
      get: {
        tags: ["admin"],
        summary: "Admin model and system metrics",
        responses: { "200": { description: "Metrics" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/observability": {
      get: {
        tags: ["admin", "system"],
        summary: "In-process observability counters and latency summaries",
        responses: { "200": { description: "Observability snapshot" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/observability/history": {
      get: {
        tags: ["admin", "system"],
        summary: "Persisted observability snapshots for time-series charts",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 60, maximum: 240 } }],
        responses: { "200": { description: "Historical observability snapshots" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/observability/alerts": {
      get: {
        tags: ["admin", "system"],
        summary: "Evaluate local alert thresholds for observability metrics",
        responses: { "200": { description: "Alert status and per-rule threshold results" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/evaluate": {
      post: {
        tags: ["admin"],
        summary: "Run offline ranking evaluation",
        responses: { "200": { description: "Evaluation report" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/embeddings/rebuild": {
      post: {
        tags: ["admin", "semantic"],
        summary: "Rebuild item embeddings and optionally sync Qdrant",
        responses: { "200": { description: "Embedding rebuild result" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-registry": {
      get: {
        tags: ["admin"],
        summary: "Model versions, weight configs, and embedding status",
        responses: { "200": { description: "Model registry" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-governance": {
      get: {
        tags: ["admin"],
        summary: "Model approval queue and activation audit trail",
        responses: { "200": { description: "Governance summary and model versions" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-governance/{version}/approve": {
      post: {
        tags: ["admin"],
        summary: "Approve a candidate model version",
        parameters: [{ name: "version", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Model approved" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-governance/{version}/reject": {
      post: {
        tags: ["admin"],
        summary: "Reject a candidate model version",
        parameters: [{ name: "version", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Model rejected" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-governance/{version}/activate": {
      post: {
        tags: ["admin"],
        summary: "Activate an approved model version",
        parameters: [{ name: "version", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Model activated and previous active model archived" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-canaries": {
      get: {
        tags: ["admin"],
        summary: "Canary rollout simulation report for approved candidate models",
        responses: { "200": { description: "Canary rollout summary, assignments, guardrails, and recommendation" }, "403": { description: "Admin role required" } }
      },
      post: {
        tags: ["admin"],
        summary: "Start a canary rollout simulation for an approved model version",
        responses: { "201": { description: "Canary rollout created" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-canaries/{id}/action": {
      post: {
        tags: ["admin"],
        summary: "Expand, pause, rollback, promote, enable live routing, or disable live routing for a canary",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Canary rollout updated" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/weights/preview": {
      post: {
        tags: ["admin"],
        summary: "Preview hybrid ranking with temporary weights",
        responses: { "200": { description: "Preview ranking and normalized weights" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/model-comparison": {
      post: {
        tags: ["admin"],
        summary: "Compare recommendation algorithms side by side",
        responses: { "200": { description: "Per-algorithm ranking summaries and pairwise overlap" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/experiments": {
      get: {
        tags: ["admin", "experiments"],
        summary: "Experiment report",
        responses: { "200": { description: "Experiment metrics" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/queues": {
      get: {
        tags: ["admin", "system"],
        summary: "BullMQ/Valkey queue status for background jobs",
        responses: { "200": { description: "Queue counts and recent jobs" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/data-quality": {
      get: {
        tags: ["admin", "data"],
        summary: "Catalog coverage, sparse users, cold-start items, and metadata gaps",
        responses: { "200": { description: "Data quality report" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/drift-report": {
      get: {
        tags: ["admin", "data"],
        summary: "Recent versus baseline recommendation input and feedback drift report",
        responses: { "200": { description: "Drift status, volumes, and signal deltas" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/drift-report/baselines": {
      post: {
        tags: ["admin", "data"],
        summary: "Capture current feature-level drift baselines",
        responses: { "200": { description: "Feature-level baseline status" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/trace-retention": {
      get: {
        tags: ["admin", "privacy"],
        summary: "Trace sampling policy and explainability retention usage",
        responses: { "200": { description: "Active policy and stored trace/log counts" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/trace-retention/policy": {
      post: {
        tags: ["admin", "privacy"],
        summary: "Update local trace sample rate and retention days",
        responses: { "200": { description: "Active trace retention policy" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/trace-retention/cleanup": {
      post: {
        tags: ["admin", "privacy"],
        summary: "Delete expired sampled trace events, explanation logs, and recommendation results",
        responses: { "200": { description: "Cleanup counts" }, "403": { description: "Admin role required" } }
      }
    },
    "/admin/privacy-audit": {
      get: {
        tags: ["admin", "privacy"],
        summary: "Privacy export and anonymization audit events",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } }],
        responses: { "200": { description: "Privacy audit events" }, "403": { description: "Admin role required" } }
      }
    }
  },
  tags: [
    { name: "auth" },
    { name: "users" },
    { name: "items" },
    { name: "recommendations" },
    { name: "feedback" },
    { name: "ratings" },
    { name: "admin" },
    { name: "semantic" },
    { name: "experiments" },
    { name: "system" },
    { name: "data" },
    { name: "privacy" }
  ]
};
