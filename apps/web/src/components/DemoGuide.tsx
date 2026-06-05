"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Gauge, Search, Settings, Sparkles } from "lucide-react";

const steps = [
  { label: "Open recommendations", detail: "Compare hybrid, semantic, content, collaborative, and popularity results.", icon: Sparkles, href: "/" },
  { label: "Inspect explainability", detail: "Use the trace debugger to see pipeline stages, score contributions, and feature values.", icon: Search, href: "/" },
  { label: "Tune personalization", detail: "Edit blocked genres, boosted providers, tags, and exploration from the profile page.", icon: Settings, href: "/profile" },
  { label: "Review operations", detail: "Check evaluation, observability, alerts, model comparison, queues, and imports.", icon: Gauge, href: "/admin" }
];

export function DemoGuide() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <section className="panel demo-guide">
      <div className="section-title">
        <div>
          <p className="eyebrow">Recruiter demo mode</p>
          <h3><ClipboardList size={17} /> Guided Walkthrough</h3>
        </div>
        <span className="score">{completed}/{steps.length}</span>
      </div>
      <div className="demo-steps">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div className="demo-step" key={step.label}>
              <button className="icon-button" title={`Mark ${step.label}`} onClick={() => setDone((current) => ({ ...current, [step.label]: !current[step.label] }))}>
                <CheckCircle2 size={16} fill={done[step.label] ? "currentColor" : "none"} />
              </button>
              <Icon size={16} />
              <div>
                <Link href={step.href}><strong>{step.label}</strong></Link>
                <p className="muted">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
