"use client";
import { Headphones, Hourglass, TrendingUp } from "lucide-react";
import BarList from "@/components/charts/BarList";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";
import { skillLabel } from "@/lib/presentation";

const minutes = (seconds?: number) =>
  seconds === undefined || seconds === null ? undefined : seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;

// The advisor's day at a glance, above the workstation: what they hold, who waits, and where.
export default function AdvisorActivity({ workspace }: { workspace: AdvisorWorkspace }) {
  const { myConversations, queues } = workspace;
  const waiting = queues.reduce((sum, queue) => sum + queue.waiting, 0);
  const busiest = [...queues].sort((a, b) => b.waiting - a.waiting)[0];
  return (
    <section className="cv-activity" aria-label="Mon activité en direct">
      <div className="cv-activity-stats">
        <article className="cv-stat-pill">
          <Headphones size={20} aria-hidden="true" />
          <span><strong>{myConversations.length}</strong> conversation{myConversations.length > 1 ? "s" : ""} en charge</span>
        </article>
        <article className="cv-stat-pill">
          <Hourglass size={20} aria-hidden="true" />
          <span><strong>{waiting}</strong> client{waiting > 1 ? "s" : ""} en attente dans vos files</span>
        </article>
        <article className="cv-stat-pill">
          <TrendingUp size={20} aria-hidden="true" />
          <span>{busiest && busiest.waiting > 0 ? <>File la plus chargée : <strong>{skillLabel[busiest.skill] || busiest.skill}</strong></> : "Aucune file sous tension"}</span>
        </article>
      </div>
      <div className="cv-activity-chart">
        <BarList title="Clients en attente par file" empty="Toutes vos files sont vides."
          items={queues.map(queue => ({
            key: queue.skill, label: skillLabel[queue.skill] || queue.skill, value: queue.waiting,
            detail: queue.oldestWaitSeconds ? `plus ancien : ${minutes(queue.oldestWaitSeconds)}` : undefined,
          }))} />
      </div>
    </section>
  );
}
