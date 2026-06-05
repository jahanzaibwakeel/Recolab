"use client";

import { useEffect, useState } from "react";
import { RecoApi } from "../lib/api";

export function PrivacyAuditPanel() {
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState("Loading privacy audit");

  async function load() {
    const nextEvents = await RecoApi.privacyAudit();
    setEvents(nextEvents);
    setStatus("Privacy audit ready");
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
  }, []);

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="section-title">
        <div>
          <h3>Privacy Audit</h3>
          <p className="muted">exports and anonymization events</p>
        </div>
        <button className="select" onClick={() => load().catch((error) => setStatus(error.message))}>Refresh</button>
      </div>
      <p className="muted">{status}</p>
      <div className="comparison-grid">
        {events.slice(0, 6).map((event) => (
          <div className="metric" key={event.id}>
            <span>{event.action}</span>
            <strong>{event.target_name ?? "Deleted user"}</strong>
            <p className="muted">actor {event.actor_name ?? "local system"} - {new Date(event.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
