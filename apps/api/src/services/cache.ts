import { Redis } from "ioredis";
import { config } from "../config.js";
import { incrementMetric } from "../observability/metrics.js";

export const cache = new Redis(config.valkeyUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true
});

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    if (cache.status === "wait") await cache.connect();
    const value = await cache.get(key);
    incrementMetric(value ? "cache.hit" : "cache.miss");
    return value ? JSON.parse(value) as T : null;
  } catch {
    incrementMetric("cache.error");
    return null;
  }
}

export async function setCached(key: string, value: unknown, ttlSeconds = config.cacheTtlSeconds) {
  try {
    if (cache.status === "wait") await cache.connect();
    await cache.set(key, JSON.stringify(value), "EX", ttlSeconds);
    incrementMetric("cache.set");
  } catch {
    incrementMetric("cache.error");
    // Cache is a performance layer; API behavior should survive local Valkey outages.
  }
}

export async function invalidateRecommendationCache(userId: string) {
  try {
    if (cache.status === "wait") await cache.connect();
    const keys = await cache.keys(`recommendations:${userId}:*`);
    if (keys.length) await cache.del(...keys);
    incrementMetric("cache.invalidate.user", keys.length);
  } catch {
    // Best effort.
  }
}

export async function invalidateAllRecommendationCache() {
  try {
    if (cache.status === "wait") await cache.connect();
    const keys = await cache.keys("recommendations:*");
    if (keys.length) await cache.del(...keys);
    incrementMetric("cache.invalidate.all", keys.length);
  } catch {
    // Best effort.
  }
}
