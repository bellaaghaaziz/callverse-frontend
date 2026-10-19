"use client";
import BarList from "@/components/charts/BarList";
import ShareBar from "@/components/charts/ShareBar";
import TrendLine from "@/components/charts/TrendLine";
import type { LiveKpi } from "@/lib/contracts";
import type { Sample } from "@/lib/charts";
import { skillLabel } from "@/lib/presentation";

const minutes = (seconds?: number) =>
  seconds === undefined || seconds === null ? undefined : seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;

// Three questions a supervisor asks in a glance, fed by the live KPI topic:
// where the load is now, where today's contacts stand, and whether the wait is rising.
export default function SupervisionCharts({ kpi, waitingHistory }: { kpi: LiveKpi | null; waitingHistory: Sample[] }) {
  return (
    <section className="cv-chart-grid cv-cs-reveal" aria-label="Tableaux de bord en direct" data-tour="supervision-charts">
      <div className="cv-cs-card">
        <BarList title="Charge par file, maintenant" empty="Aucun client en attente."
          items={(kpi?.queues || []).map(queue => ({
            key: queue.skill, label: skillLabel[queue.skill] || queue.skill, value: queue.waiting,
            detail: queue.oldestWaitSeconds ? `plus ancien : ${minutes(queue.oldestWaitSeconds)}` : undefined,
          }))} />
      </div>
      <div className="cv-cs-card">
        <ShareBar title="Où en sont les contacts du jour"
          parts={[
            { key: "resolved", label: "Résolus", value: kpi?.resolvedToday ?? 0 },
            { key: "waiting", label: "En attente", value: kpi?.waitingTotal ?? 0 },
            { key: "service", label: "En conversation", value: kpi?.inService ?? 0 },
            { key: "abandoned", label: "Abandonnés", value: kpi?.abandonedToday ?? 0 },
          ]} />
      </div>
      <div className="cv-cs-card">
        <TrendLine title="Clients en attente depuis votre arrivée" samples={waitingHistory}
          empty="La courbe se dessine au fil des mises à jour en direct." />
      </div>
    </section>
  );
}
