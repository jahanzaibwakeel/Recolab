import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { signAuthToken } from "../src/auth/jwt.js";
import { pool } from "../src/db/pool.js";
import { seed } from "../src/db/seed.js";
import { cache } from "../src/services/cache.js";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const suite = runIntegration ? describe : describe.skip;

suite("api integration", () => {
  let adminToken = "";
  let userId = "";

  beforeAll(async () => {
    await seed();
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "ada@recolab.local", password: "recolab-demo" });
    expect(login.status).toBe(200);
    adminToken = login.body.token;
    userId = login.body.user.id;
  }, 60_000);

  afterAll(async () => {
    cache.disconnect();
    await pool.end();
  });

  it("serves seeded catalog search", async () => {
    const response = await request(app).get("/items?q=matrix&domain=movies&limit=5");
    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThan(0);
    expect(response.body.rows[0].title).toContain("Matrix");
  });

  it("serves recommendations from seeded data", async () => {
    const response = await request(app).get(`/recommendations/${userId}?algorithm=hybrid&k=3`);
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].explanation.generatedText).toBeTruthy();
  });

  it("protects and serves admin observability history", async () => {
    const viewerToken = signAuthToken({ sub: "u2", email: "viewer@test.local", name: "Viewer", role: "viewer" });
    const forbidden = await request(app).get("/admin/observability/history").set("Authorization", `Bearer ${viewerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app).get("/admin/observability/history?limit=5").set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.body)).toBe(true);
  });
});
