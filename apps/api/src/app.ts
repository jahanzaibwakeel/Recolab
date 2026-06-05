import cors from "cors";
import express from "express";
import { adminRouter } from "./routes/admin.js";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { feedbackRouter } from "./routes/feedback.js";
import { docsRouter } from "./routes/docs.js";
import { itemsRouter } from "./routes/items.js";
import { ratingsRouter } from "./routes/ratings.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { usersRouter } from "./routes/users.js";
import { requireRole } from "./auth/middleware.js";
import { httpMetrics } from "./observability/httpMetrics.js";
import { requestContext } from "./security/requestContext.js";
import { localRateLimit } from "./security/rateLimit.js";
import { securityHeaders } from "./security/securityHeaders.js";
import { config } from "./config.js";

export const app = express();

app.use(requestContext);
app.use(securityHeaders);
app.use(cors());
app.use(localRateLimit({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }));
app.use(express.json({ limit: "1mb" }));
app.use(httpMetrics);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "recolab-api" }));
app.use(docsRouter);
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/items", itemsRouter);
app.use("/ratings", ratingsRouter);
app.use("/recommendations", recommendationsRouter);
app.use("/feedback", feedbackRouter);
app.use("/admin", requireRole("admin"), adminRouter);
app.use("/ai", aiRouter);

app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error.statusCode ?? 400;
  res.status(status).json({
    error: error.message ?? "Unexpected error",
    requestId: req.requestId,
    issues: error.issues?.map((issue: any) => ({
      path: issue.path?.join(".") ?? "",
      message: issue.message,
      code: issue.code
    }))
  });
});
