import { describe, expect, it } from "vitest";
import { localRateLimit, resetRateLimitBuckets } from "../src/security/rateLimit.js";

describe("localRateLimit", () => {
  it("returns 429 after the configured maximum", () => {
    resetRateLimitBuckets();
    const middleware = localRateLimit({ windowMs: 60_000, max: 1, keyPrefix: "test" });
    const req = { ip: "127.0.0.1", path: "/demo", requestId: "r1" } as any;
    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: undefined as any,
      setHeader(name: string, value: string) { this.headers[name] = value; },
      status(code: number) { this.statusCode = code; return this; },
      json(body: any) { this.body = body; return this; }
    };
    let nextCalls = 0;

    middleware(req, res as any, () => { nextCalls += 1; });
    middleware(req, res as any, () => { nextCalls += 1; });

    expect(nextCalls).toBe(1);
    expect(res.statusCode).toBe(429);
    expect(res.body.requestId).toBe("r1");
  });
});
