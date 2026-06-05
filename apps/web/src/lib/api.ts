import type { CatalogItem, RecommendationAlgorithm, RecommendationResult, UserProfile } from "@recolab/shared";
import { authHeader, clearSession, getSession, saveSession, type Session } from "./auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value));
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  if (response.status === 401 && path !== "/auth/refresh" && !retried) {
    const refreshed = await refreshStoredSession();
    if (refreshed) {
      return api<T>(path, init, true);
    }
  }
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function refreshStoredSession() {
  const session = getSession();
  if (!session?.refreshToken) return false;
  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    cache: "no-store"
  });
  if (!response.ok) {
    clearSession();
    return false;
  }
  saveSession(await response.json() as Session);
  return true;
}

export interface CatalogSearchResponse {
  rows: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
  facets: {
    domains: Array<{ value: string; count: number }>;
    genres: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
  };
}

export const RecoApi = {
  login: async (email: string, password: string) => {
    const session = await api<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    saveSession(session);
    return session;
  },
  refreshSession: async () => {
    const session = getSession();
    if (!session?.refreshToken) throw new Error("No refresh token is stored");
    const refreshed = await api<Session>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) });
    saveSession(refreshed);
    return refreshed;
  },
  logout: async () => {
    const session = getSession();
    if (session?.refreshToken) await api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) });
    clearSession();
  },
  requestPasswordReset: (email: string) => api<any>("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }),
  confirmPasswordReset: (resetToken: string, newPassword: string) => api<any>("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ resetToken, newPassword }) }),
  users: () => api<UserProfile[]>("/users"),
  user: (id: string) => api<UserProfile>(`/users/${id}`),
  userHistory: (id: string) => api<any>(`/users/${id}/history`),
  privacyExport: (id: string) => api<any>(`/users/${id}/privacy/export`),
  anonymizeUser: (id: string, reason: string) => api<any>(`/users/${id}/privacy/anonymize`, { method: "POST", body: JSON.stringify({ reason }) }),
  items: () => api<CatalogItem[]>("/items"),
  searchItems: (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") search.set(key, String(value));
    });
    return api<CatalogSearchResponse>(`/items?${search.toString()}`);
  },
  item: (id: string) => api<CatalogItem>(`/items/${id}`),
  similar: (id: string) => api<Array<{ item: CatalogItem; similarity: number; matchedAttributes: string[] }>>(`/items/${id}/similar`),
  recommendations: (userId: string, algorithm: RecommendationAlgorithm) => api<RecommendationResult[]>(`/recommendations/${userId}?algorithm=${algorithm}&k=8`),
  recommendationTrace: (userId: string, itemId: string, algorithm: RecommendationAlgorithm) => api<any>(`/recommendations/${userId}/trace/${itemId}?algorithm=${algorithm}&k=20`),
  recommendationTraceExportUrl: (userId: string, itemId: string, algorithm: RecommendationAlgorithm, format: "json" | "html") =>
    `${apiUrl}/recommendations/${userId}/trace/${itemId}/export?algorithm=${algorithm}&k=20&format=${format}`,
  feedback: (userId: string, itemId: string, action: string) => api("/feedback", { method: "POST", body: JSON.stringify({ userId, itemId, action }) }),
  metrics: () => api<any>("/admin/metrics"),
  observability: () => api<any>("/admin/observability"),
  observabilityHistory: () => api<any[]>("/admin/observability/history?limit=60"),
  observabilityAlerts: () => api<any>("/admin/observability/alerts"),
  evaluate: () => api<any>("/admin/evaluate", { method: "POST" }),
  queueModelRefresh: () => api<any>("/admin/model-refresh", { method: "POST" }),
  refreshFeatures: () => api<any>("/admin/feature-refresh", { method: "POST" }),
  rebuildEmbeddings: () => api<any>("/admin/embeddings/rebuild", { method: "POST", body: JSON.stringify({ syncQdrant: true }) }),
  importMovieLens: (body: { sourceDir: string; limitRatings: number }) => api<any>("/admin/datasets/movielens", { method: "POST", body: JSON.stringify(body) }),
  modelRegistry: () => api<any>("/admin/model-registry"),
  modelGovernance: () => api<any>("/admin/model-governance"),
  approveModelVersion: (version: string, notes: string) => api<any>(`/admin/model-governance/${encodeURIComponent(version)}/approve`, { method: "POST", body: JSON.stringify({ notes }) }),
  rejectModelVersion: (version: string, reason: string) => api<any>(`/admin/model-governance/${encodeURIComponent(version)}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  activateModelVersion: (version: string, notes: string) => api<any>(`/admin/model-governance/${encodeURIComponent(version)}/activate`, { method: "POST", body: JSON.stringify({ notes }) }),
  modelCanaries: () => api<any>("/admin/model-canaries"),
  createCanary: (body: { candidateVersion: string; trafficPercent: number; notes?: string }) => api<any>("/admin/model-canaries", { method: "POST", body: JSON.stringify(body) }),
  updateCanary: (id: string, body: { action: "expand" | "pause" | "rollback" | "promote" | "enable_live" | "disable_live"; trafficPercent?: number }) => api<any>(`/admin/model-canaries/${id}/action`, { method: "POST", body: JSON.stringify(body) }),
  experiments: () => api<any[]>("/admin/experiments"),
  queues: () => api<any>("/admin/queues"),
  dataQuality: () => api<any>("/admin/data-quality"),
  driftReport: () => api<any>("/admin/drift-report"),
  captureDriftBaselines: (baselineWindowDays = 30) => api<any>("/admin/drift-report/baselines", { method: "POST", body: JSON.stringify({ baselineWindowDays }) }),
  traceRetention: () => api<any>("/admin/trace-retention"),
  updateTraceRetentionPolicy: (body: { sampleRate: number; retentionDays: number; exportFormat?: "json" | "html" | "both"; storageMode?: "download_only" | "local_file"; includeFeatureValues?: boolean }) => api<any>("/admin/trace-retention/policy", { method: "POST", body: JSON.stringify(body) }),
  cleanupTraceRetention: () => api<any>("/admin/trace-retention/cleanup", { method: "POST" }),
  privacyAudit: () => api<any[]>("/admin/privacy-audit?limit=30"),
  saveWeights: (body: any) => api<any>("/admin/weights", { method: "POST", body: JSON.stringify(body) }),
  previewWeights: (body: any) => api<any>("/admin/weights/preview", { method: "POST", body: JSON.stringify(body) }),
  modelComparison: (body: any) => api<any>("/admin/model-comparison", { method: "POST", body: JSON.stringify(body) }),
  abTest: (userId: string) => api<any>(`/recommendations/${userId}/ab-test?k=5`),
  logs: () => api<any[]>("/admin/explanation-logs"),
  preferences: (id: string, body: {
    preferredGenres: string[];
    preferredSkills: string[];
    blockedGenres: string[];
    boostedProviders: string[];
    boostedTags: string[];
    personalExploration: number;
  }) => api<UserProfile>(`/users/${id}/preferences`, {
    method: "PATCH",
    body: JSON.stringify(body)
  })
};
