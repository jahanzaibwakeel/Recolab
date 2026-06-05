import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const inbound = req.header("x-request-id");
  req.requestId = inbound && inbound.length <= 120 ? inbound : randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
