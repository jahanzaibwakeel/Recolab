import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { signAuthToken } from "../src/auth/jwt.js";
import { resetRateLimitBuckets } from "../src/security/rateLimit.js";

describe("app", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("serves health status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("adds request id and security headers", async () => {
    const response = await request(app).get("/health").set("x-request-id", "test-request-id");
    expect(response.header["x-request-id"]).toBe("test-request-id");
    expect(response.header["x-content-type-options"]).toBe("nosniff");
    expect(response.header["x-frame-options"]).toBe("DENY");
    expect(response.header["content-security-policy"]).toContain("default-src");
  });

  it("returns structured validation errors with request id", async () => {
    const response = await request(app).post("/auth/login").set("x-request-id", "bad-login").send({ email: "not-email", password: "" });
    expect(response.status).toBe(400);
    expect(response.body.requestId).toBe("bad-login");
    expect(response.body.issues[0]).toHaveProperty("path");
  });

  it("protects admin routes with RBAC", async () => {
    const anonymous = await request(app).get("/admin/metrics");
    expect(anonymous.status).toBe(401);

    const viewerToken = signAuthToken({ sub: "u1", email: "viewer@test.local", name: "Viewer", role: "viewer" });
    const forbidden = await request(app).get("/admin/metrics").set("Authorization", `Bearer ${viewerToken}`);
    expect(forbidden.status).toBe(403);
  });

  it("serves OpenAPI documentation", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.1.0");
    expect(response.body.paths["/auth/login"]).toBeDefined();
  });

  it("documents observability endpoint", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/observability"]).toBeDefined();
    expect(response.body.paths["/admin/observability/history"]).toBeDefined();
    expect(response.body.paths["/admin/observability/alerts"]).toBeDefined();
  });

  it("documents recommendation trace endpoint", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/recommendations/{userId}/trace/{itemId}"]).toBeDefined();
    expect(response.body.paths["/recommendations/{userId}/trace/{itemId}/export"]).toBeDefined();
  });

  it("documents weight preview endpoint", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/weights/preview"]).toBeDefined();
  });

  it("documents model comparison endpoint", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/model-comparison"]).toBeDefined();
  });

  it("documents queue operations endpoint", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/queues"]).toBeDefined();
  });

  it("documents data quality endpoint", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/data-quality"]).toBeDefined();
  });

  it("documents model governance endpoints", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/model-governance"]).toBeDefined();
    expect(response.body.paths["/admin/model-governance/{version}/approve"]).toBeDefined();
    expect(response.body.paths["/admin/model-governance/{version}/reject"]).toBeDefined();
    expect(response.body.paths["/admin/model-governance/{version}/activate"]).toBeDefined();
  });

  it("documents model canary endpoints", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/model-canaries"]).toBeDefined();
    expect(response.body.paths["/admin/model-canaries/{id}/action"]).toBeDefined();
  });

  it("documents user history endpoint", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/users/{id}/history"]).toBeDefined();
  });

  it("documents privacy controls", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/users/{id}/privacy/export"]).toBeDefined();
    expect(response.body.paths["/users/{id}/privacy/anonymize"]).toBeDefined();
    expect(response.body.paths["/admin/privacy-audit"]).toBeDefined();
  });

  it("documents drift and trace retention controls", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/admin/drift-report"]).toBeDefined();
    expect(response.body.paths["/admin/drift-report/baselines"]).toBeDefined();
    expect(response.body.paths["/admin/trace-retention"]).toBeDefined();
    expect(response.body.paths["/admin/trace-retention/policy"]).toBeDefined();
    expect(response.body.paths["/admin/trace-retention/cleanup"]).toBeDefined();
  });

  it("documents catalog search parameters", async () => {
    const response = await request(app).get("/openapi.json");
    const parameters = response.body.paths["/items"].get.parameters.map((parameter: any) => parameter.name);
    expect(parameters).toContain("q");
    expect(parameters).toContain("domain");
    expect(parameters).toContain("sort");
  });

  it("documents refresh and password reset endpoints", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.body.paths["/auth/refresh"]).toBeDefined();
    expect(response.body.paths["/auth/logout"]).toBeDefined();
    expect(response.body.paths["/auth/password-reset/request"]).toBeDefined();
    expect(response.body.paths["/auth/password-reset/confirm"]).toBeDefined();
  });

  it("documents advanced personalization controls", async () => {
    const response = await request(app).get("/openapi.json");
    const properties = response.body.paths["/users/{id}/preferences"].patch.requestBody.content["application/json"].schema.properties;
    expect(properties.blockedGenres).toBeDefined();
    expect(properties.boostedProviders).toBeDefined();
    expect(properties.personalExploration).toBeDefined();
  });
});
