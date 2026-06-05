import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function localRateLimit(options: { windowMs: number; max: number; keyPrefix?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix ?? "global"}:${req.ip ?? "unknown"}:${req.path}`;
    const bucket = buckets.get(key);
    const active = bucket && bucket.resetAt > now ? bucket : { count: 0, resetAt: now + options.windowMs };
    active.count += 1;
    buckets.set(key, active);

    const remaining = Math.max(0, options.max - active.count);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(active.resetAt / 1000)));

    if (active.count > options.max) {
      return res.status(429).json({
        error: "Too many requests",
        requestId: req.requestId,
        retryAfterSeconds: Math.max(1, Math.ceil((active.resetAt - now) / 1000))
      });
    }
    next();
  };
}

export function resetRateLimitBuckets() {
  buckets.clear();
}
