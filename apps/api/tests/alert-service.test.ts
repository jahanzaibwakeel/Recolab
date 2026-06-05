import { describe, expect, it } from "vitest";
import { evaluateAlertSnapshot } from "../src/services/alertService.js";

describe("evaluateAlertSnapshot", () => {
  it("returns local threshold rules", async () => {
    const report = evaluateAlertSnapshot({ timers: {}, derived: {} });
    expect(report.status).toMatch(/ok|warning|critical/);
    expect(report.alerts.map((alert) => alert.key)).toContain("api_latency");
    expect(report.alerts.map((alert) => alert.key)).toContain("cache_hit_rate");
  });

  it("marks high latency as critical", () => {
    const report = evaluateAlertSnapshot({ timers: { api: { avgMs: 2000 } }, derived: { cacheHitRate: 1 } });
    expect(report.alerts.find((alert) => alert.key === "api_latency")?.severity).toBe("critical");
  });
});
