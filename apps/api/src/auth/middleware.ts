import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken, type AuthTokenPayload } from "./jwt.js";

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    req.auth = verifyAuthToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.auth || !roles.includes(req.auth.role)) {
        return res.status(403).json({ error: "Insufficient role" });
      }
      return next();
    });
  };
}

export function requireSelfOrRole(paramName: string, ...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (req.auth?.sub === req.params[paramName] || (req.auth && roles.includes(req.auth.role))) {
        return next();
      }
      return res.status(403).json({ error: "Insufficient role" });
    });
  };
}
