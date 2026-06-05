import type { UserProfile } from "@recolab/shared";

const tokenKey = "recolab_token";
const refreshTokenKey = "recolab_refresh_token";
const refreshTokenExpiresAtKey = "recolab_refresh_token_expires_at";
const userKey = "recolab_user";

export interface Session {
  token: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  user: UserProfile;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(tokenKey);
  const refreshToken = window.localStorage.getItem(refreshTokenKey) ?? undefined;
  const refreshTokenExpiresAt = window.localStorage.getItem(refreshTokenExpiresAtKey) ?? undefined;
  const rawUser = window.localStorage.getItem(userKey);
  if (!token || !rawUser) return null;
  try {
    return { token, refreshToken, refreshTokenExpiresAt, user: JSON.parse(rawUser) as UserProfile };
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(tokenKey, session.token);
  if (session.refreshToken) window.localStorage.setItem(refreshTokenKey, session.refreshToken);
  if (session.refreshTokenExpiresAt) window.localStorage.setItem(refreshTokenExpiresAtKey, session.refreshTokenExpiresAt);
  window.localStorage.setItem(userKey, JSON.stringify(session.user));
}

export function clearSession() {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(refreshTokenKey);
  window.localStorage.removeItem(refreshTokenExpiresAtKey);
  window.localStorage.removeItem(userKey);
}

export function authHeader() {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}
