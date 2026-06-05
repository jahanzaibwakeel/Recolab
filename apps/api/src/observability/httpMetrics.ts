import { performance } from "node:perf_hooks";
import type { NextFunction, Request, Response } from "express";
import { incrementMetric, observeDuration } from "./metrics.js";

export function httpMetrics(req: Request, res: Response, next: NextFunction) {
  const started = performance.now();
  res.on("finish", () => {
    const route = req.route?.path ?? req.path;
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
    incrementMetric(`http.${req.method}.${statusClass}`);
    observeDuration("api", performance.now() - started);
    observeDuration(`api.${req.method}.${route}`, performance.now() - started);
  });
  next();
}

