"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserProfile } from "@recolab/shared";
import { RecoApi } from "../lib/api";
import { getSession } from "../lib/auth";

export function UserHistoryView({ users }: { users: UserProfile[] }) {
  const session = getSession();
  const [userId, setUserId] = useState(session?.user.id ?? users[0]?.id ?? "");
  const [history, setHistory] = useState<any>(null);
  const [status, setStatus] = useState("Loading user history");

  async function load(nextUserId = userId) {
    setStatus("Loading history");
    const result = await RecoApi.userHistory(nextUserId);
    setHistory(result);
    setStatus("History ready");
  }

  useEffect(() => {
    if (userId) load(userId).catch((error) => setStatus(error.message));
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Personal activity</p>
          <h2>Saved Items and History</h2>
        </div>
        <div className="toolbar">
          <select className="select" value={userId} onChange={(event) => { setUserId(event.target.value); load(event.target.value); }}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        </div>
      </div>
      <p className="muted">{status}. Sign in as the user or as an admin to view protected history.</p>

      <section className="dashboard">
        <HistoryPanel title="Saved Items" rows={history?.savedItems ?? []} empty="No saved items yet." />
        <TimelinePanel title="Recent Interactions" rows={history?.interactions ?? []} empty="No interactions yet." />
      </section>

      <section className="dashboard">
        <TimelinePanel title="Ratings" rows={history?.ratings ?? []} empty="No ratings yet." />
        <TimelinePanel title="Recommendation History" rows={history?.recommendations ?? []} empty="No served recommendations logged yet." />
      </section>
    </>
  );
}

function HistoryPanel({ title, rows, empty }: { title: string; rows: any[]; empty: string }) {
  return (
    <article className="panel">
      <div className="section-title">
        <h3>{title}</h3>
        <span className="muted">{rows.length}</span>
      </div>
      {rows.map((item) => (
        <div className="metric" key={item.id} style={{ marginTop: 8 }}>
          <Link href={`/items/${item.id}`}><strong>{item.title}</strong></Link>
          <p className="muted">{item.domain} - {(item.genres ?? []).join(", ")}</p>
        </div>
      ))}
      {!rows.length ? <p className="muted">{empty}</p> : null}
    </article>
  );
}

function TimelinePanel({ title, rows, empty }: { title: string; rows: any[]; empty: string }) {
  return (
    <article className="panel">
      <div className="section-title">
        <h3>{title}</h3>
        <span className="muted">{rows.length}</span>
      </div>
      {rows.map((row) => (
        <div className="metric" key={row.id} style={{ marginTop: 8 }}>
          <strong>{row.item?.title ?? row.algorithm}</strong>
          <p className="muted">
            {row.eventType ?? row.algorithm ?? "rating"} {row.rating ? `- ${row.rating}` : ""} {row.score ? `- score ${Number(row.score).toFixed(2)}` : ""}
          </p>
        </div>
      ))}
      {!rows.length ? <p className="muted">{empty}</p> : null}
    </article>
  );
}

