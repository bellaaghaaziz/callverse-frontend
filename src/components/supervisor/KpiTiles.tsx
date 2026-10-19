import { CheckCircle2, Clock, Headphones, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LiveKpi } from "@/lib/contracts";

type Tile = {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  foot: string;
  art: "arc" | "rings";
  rose?: boolean;
};

// Four stat tiles (2026-10-11 dashboard mockup). The number and its caption
// carry the meaning; the art on the right is decoration only, arcs and dots
// that cannot be read as a series or a trend.
export default function KpiTiles({ kpi }: { kpi: LiveKpi | null }) {
  const now = "Situation actuelle";
  const today = "Depuis le début de la journée";
  const tiles: Tile[] = [
    {
      label: "En attente",
      value: kpi?.waitingTotal,
      icon: Clock,
      foot: "Avant affectation humaine, IA incluse",
      art: "arc",
    },
    {
      label: "En conversation",
      value: kpi?.inService,
      icon: Headphones,
      foot: now + " · affectées ou escaladées",
      art: "rings",
    },
    {
      label: "Résolues aujourd’hui",
      value: kpi?.resolvedToday,
      icon: CheckCircle2,
      foot: today,
      art: "rings",
    },
    {
      label: "Abandonnées aujourd’hui",
      value: kpi?.abandonedToday,
      icon: LogOut,
      foot: today,
      art: "arc",
      rose: true,
    },
  ];
  return (
    <div className="cv-stat-grid">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={"cv-card cv-kpi" + (tile.rose ? " cv-kpi-rose" : "")}
        >
          <span className="cv-kpi-icon" aria-hidden="true">
            <tile.icon size={24} />
          </span>
          <p className="cv-kpi-label">{tile.label}</p>
          <p className="cv-kpi-value">{tile.value ?? "—"}</p>
          <p className="cv-kpi-foot">{tile.foot}</p>
          <KpiArt kind={tile.art} />
        </div>
      ))}
    </div>
  );
}

function KpiArt({ kind }: { kind: Tile["art"] }) {
  return (
    <svg className="cv-kpi-art" aria-hidden="true" viewBox="0 0 150 112">
      {kind === "arc" ? (
        <>
          <path
            className="cv-kpi-art-fill"
            d="M40 112 A 104 104 0 0 1 144 8 V 112 Z"
          />
          <path className="cv-kpi-art-line" d="M62 112 A 82 82 0 0 1 144 30" />
          <circle className="cv-kpi-art-dot" cx="122" cy="74" r="9" />
        </>
      ) : (
        <>
          <circle className="cv-kpi-art-line" cx="150" cy="112" r="96" />
          <circle className="cv-kpi-art-line" cx="150" cy="112" r="66" />
          <circle className="cv-kpi-art-fill" cx="150" cy="112" r="40" />
        </>
      )}
    </svg>
  );
}
