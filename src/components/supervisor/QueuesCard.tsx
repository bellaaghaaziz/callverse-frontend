import { Info, Layers } from "lucide-react";
import type { LiveKpi } from "@/lib/contracts";
import { skillLabel, timeLabel } from "@/lib/presentation";
import { percentLabel, waitLabel } from "@/lib/supervision";
import CardHeading from "./CardHeading";

// « Files par compétence »: waiting contacts per queue, then three indicators.
export default function QueuesCard({ kpi }: { kpi: LiveKpi | null }) {
  const indicators = [
    ["Attente moyenne", waitLabel(kpi?.averageWaitSeconds)],
    ["Respect du délai cible", percentLabel(kpi?.slaRatio)],
    ["Taux d’abandon", percentLabel(kpi?.abandonRate)],
  ];
  return (
    <section className="cv-card">
      <CardHeading
        icon={Layers}
        title="Files par compétence"
        subtitle="Répartition des contacts en attente"
        count={kpi?.queues.length || 0}
      />
      <div
        className="cv-table-wrap"
        role="region"
        aria-label="Files par compétence"
        tabIndex={0}
      >
        <table className="cv-table cv-queue-table">
          <caption className="sr-only">Files par compétence</caption>
          <thead>
            <tr>
              <th scope="col">Compétence</th>
              <th scope="col">En attente</th>
              <th scope="col">Attente la plus longue</th>
            </tr>
          </thead>
          <tbody>
            {kpi?.queues.map((queue) => (
              <tr key={queue.skill}>
                <td>
                  <span
                    className={
                      "cv-status-dot " +
                      (queue.skill === "FRAUD" ? "cv-dot-rose" : "cv-dot-green")
                    }
                  />
                  {skillLabel[queue.skill] || queue.skill}
                </td>
                <td>
                  <span className="cv-count">{queue.waiting}</span>
                </td>
                <td>{waitLabel(queue.oldestWaitSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!kpi && <div className="cv-empty">Chargement de l’activité…</div>}
      <dl className="cv-indicators">
        {indicators.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="cv-footnote">
        <Info size={14} aria-hidden="true" />
        Les indicateurs affichent « — » lorsqu’aucune mesure n’est disponible.
        {kpi ? " · Mise à jour " + timeLabel(kpi.at) : ""}
      </p>
    </section>
  );
}
