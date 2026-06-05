"use client";

import { useState } from "react";
import type { UserProfile } from "@recolab/shared";
import { RecoApi } from "../lib/api";

export function PrivacyControls({ users }: { users: UserProfile[] }) {
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const [reason, setReason] = useState("User requested local data deletion");
  const [status, setStatus] = useState("Export or remove local user data.");

  async function exportData() {
    setStatus("Preparing privacy export");
    const data = await RecoApi.privacyExport(selectedId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recolab-privacy-export-${selectedId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Privacy export generated");
  }

  async function anonymize() {
    setStatus("Anonymizing local user data");
    await RecoApi.anonymizeUser(selectedId, reason);
    setStatus("User data anonymized; refresh the page to reload profile state.");
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Privacy controls</p>
          <h2>Data Export and Deletion</h2>
        </div>
        <select className="select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      </div>
      <p className="muted">{status}</p>
      <div className="toolbar">
        <input
          className="input wide-input"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-label="Deletion reason"
        />
        <button className="select" onClick={exportData}>Export data</button>
        <button className="select" onClick={anonymize}>Anonymize user</button>
      </div>
    </section>
  );
}
