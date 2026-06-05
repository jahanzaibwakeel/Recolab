"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole, RotateCw } from "lucide-react";
import { clearSession, getSession } from "../lib/auth";
import { RecoApi } from "../lib/api";

export function LoginPanel({ onChange }: { onChange: () => void }) {
  const [email, setEmail] = useState("ada@recolab.local");
  const [password, setPassword] = useState("recolab-demo");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("recolab-demo");
  const [status, setStatus] = useState(() => getSession()?.user ? `Signed in as ${getSession()?.user.name}` : "Admin login required");

  async function login() {
    try {
      const session = await RecoApi.login(email, password);
      setStatus(`Signed in as ${session.user.name} (${session.user.role})`);
      onChange();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    }
  }

  function logout() {
    RecoApi.logout()
      .catch(() => clearSession())
      .finally(() => {
        setStatus("Signed out and refresh token revoked");
        onChange();
      });
  }

  async function refreshSession() {
    try {
      const session = await RecoApi.refreshSession();
      setStatus(`Session refreshed for ${session.user.name}`);
      onChange();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Refresh failed");
    }
  }

  async function requestReset() {
    try {
      const response = await RecoApi.requestPasswordReset(email);
      if (response.resetToken) setResetToken(response.resetToken);
      setStatus("Local reset token generated");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Reset request failed");
    }
  }

  async function confirmReset() {
    try {
      await RecoApi.confirmPasswordReset(resetToken, newPassword);
      setPassword(newPassword);
      setStatus("Password reset locally; old refresh tokens revoked");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Reset confirm failed");
    }
  }

  return (
    <section className="panel" style={{ marginBottom: 14 }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Secure admin session</p>
          <h3><LockKeyhole size={17} /> JWT Auth + RBAC</h3>
        </div>
        <span className="muted">{status}</span>
      </div>
      <div className="toolbar">
        <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="email" />
        <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" aria-label="password" />
        <button className="select" onClick={login}>Login</button>
        <button className="icon-button" title="Refresh session" onClick={refreshSession}><RotateCw size={16} /></button>
        <button className="select" onClick={logout}>Logout</button>
      </div>
      <div className="toolbar" style={{ marginTop: 10 }}>
        <button className="select" onClick={requestReset}><KeyRound size={15} /> Request reset</button>
        <input className="input wide-input" value={resetToken} onChange={(event) => setResetToken(event.target.value)} aria-label="reset token" placeholder="Local reset token" />
        <input className="input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" aria-label="new password" />
        <button className="select" onClick={confirmReset}>Set password</button>
      </div>
    </section>
  );
}
