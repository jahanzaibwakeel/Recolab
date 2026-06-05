"use client";

import { useState } from "react";
import type { UserProfile } from "@recolab/shared";
import { RecoApi } from "../lib/api";

export function ProfileEditor({ users }: { users: UserProfile[] }) {
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const [current, setCurrent] = useState(users[0]);
  const [genres, setGenres] = useState(current?.preferredGenres.join(", ") ?? "");
  const [skills, setSkills] = useState(current?.preferredSkills.join(", ") ?? "");
  const [blockedGenres, setBlockedGenres] = useState(current?.blockedGenres.join(", ") ?? "");
  const [boostedProviders, setBoostedProviders] = useState(current?.boostedProviders.join(", ") ?? "");
  const [boostedTags, setBoostedTags] = useState(current?.boostedTags.join(", ") ?? "");
  const [personalExploration, setPersonalExploration] = useState(current?.personalExploration ?? 0.08);
  const [status, setStatus] = useState("Preferences drive cold-start and content-based ranking.");

  function select(id: string) {
    const next = users.find((user) => user.id === id);
    setSelectedId(id);
    setCurrent(next);
    setGenres(next?.preferredGenres.join(", ") ?? "");
    setSkills(next?.preferredSkills.join(", ") ?? "");
    setBlockedGenres(next?.blockedGenres.join(", ") ?? "");
    setBoostedProviders(next?.boostedProviders.join(", ") ?? "");
    setBoostedTags(next?.boostedTags.join(", ") ?? "");
    setPersonalExploration(next?.personalExploration ?? 0.08);
  }

  async function save() {
    const updated = await RecoApi.preferences(selectedId, {
      preferredGenres: splitList(genres),
      preferredSkills: splitList(skills),
      blockedGenres: splitList(blockedGenres),
      boostedProviders: splitList(boostedProviders),
      boostedTags: splitList(boostedTags),
      personalExploration
    });
    setCurrent(updated);
    setStatus("Preferences saved; recommendation cache will update after new requests.");
  }

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">Profile and preferences</p>
          <h2>{current?.name ?? "User"}</h2>
        </div>
        <select className="select" value={selectedId} onChange={(event) => select(event.target.value)}>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      </div>
      <p className="muted">{status}</p>
      <label>
        <span className="muted">Preferred genres</span>
        <input className="input" style={{ width: "100%", marginTop: 6 }} value={genres} onChange={(event) => setGenres(event.target.value)} />
      </label>
      <br />
      <br />
      <label>
        <span className="muted">Preferred skills and interests</span>
        <input className="input" style={{ width: "100%", marginTop: 6 }} value={skills} onChange={(event) => setSkills(event.target.value)} />
      </label>
      <br />
      <br />
      <div className="dashboard" style={{ marginTop: 0 }}>
        <label className="preference-field">
          <span className="muted">Blocked genres</span>
          <input className="input" style={{ width: "100%", marginTop: 6 }} value={blockedGenres} onChange={(event) => setBlockedGenres(event.target.value)} />
        </label>
        <label className="preference-field">
          <span className="muted">Boosted providers</span>
          <input className="input" style={{ width: "100%", marginTop: 6 }} value={boostedProviders} onChange={(event) => setBoostedProviders(event.target.value)} />
        </label>
      </div>
      <div className="dashboard" style={{ marginTop: 12 }}>
        <label className="preference-field">
          <span className="muted">Boosted tags</span>
          <input className="input" style={{ width: "100%", marginTop: 6 }} value={boostedTags} onChange={(event) => setBoostedTags(event.target.value)} />
        </label>
        <label className="preference-field">
          <span className="muted">Personal exploration</span>
          <div className="slider-row" style={{ borderBottom: 0 }}>
            <span>range</span>
            <input type="range" min="0" max="0.4" step="0.01" value={personalExploration} onChange={(event) => setPersonalExploration(Number(event.target.value))} />
            <strong>{personalExploration.toFixed(2)}</strong>
          </div>
        </label>
      </div>
      <br />
      <button className="select" onClick={save}>Save preferences</button>
    </section>
  );
}

function splitList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}
