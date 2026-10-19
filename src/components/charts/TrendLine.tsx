"use client";
import { useId, useState } from "react";
import { trendPoints, type Sample } from "@/lib/charts";

const W = 320, H = 96, PAD = 6;
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Change over time for one live measure: a 2px line on a soft area, zero-based, newest on the
// right. Hovering (or focusing) shows the value and the time of the nearest sample.
export default function TrendLine({ title, samples, unit = "", empty }: {
  title: string; samples: Sample[]; unit?: string; empty: string;
}) {
  const gradient = useId();
  const [hover, setHover] = useState<number | null>(null);
  const points = trendPoints(samples.map(s => s.value), W - PAD * 2, H - PAD * 2).map(p => ({ ...p, x: p.x + PAD, y: p.y + PAD }));
  const last = samples[samples.length - 1];
  const shown = hover !== null ? hover : points.length - 1;
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const area = points.length > 1 ? `${line} L${points[points.length - 1].x},${H - PAD} L${points[0].x},${H - PAD} Z` : "";
  function pick(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    points.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(points[nearest].x - x)) nearest = i; });
    setHover(nearest);
  }
  return (
    <figure className="cv-chart">
      <figcaption className="cv-chart-title">{title}
        {last && <span className="cv-chart-total">{last.value}{unit} maintenant</span>}
      </figcaption>
      {points.length < 2 ? <p className="cv-chart-empty">{empty}</p> : (
        <div className="cv-trend">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} : ${samples.map(s => s.value).join(", ")}`}
            onPointerMove={pick} onPointerLeave={() => setHover(null)} tabIndex={0}
            onKeyDown={e => { if (e.key === "ArrowLeft") setHover(Math.max(0, shown - 1)); if (e.key === "ArrowRight") setHover(Math.min(points.length - 1, shown + 1)); }}>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#067a61" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#067a61" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="cv-trend-axis" />
            <path d={area} fill={`url(#${gradient})`} />
            <path d={line} className="cv-trend-line" pathLength={1} />
            {hover !== null && <line x1={points[shown].x} x2={points[shown].x} y1={PAD} y2={H - PAD} className="cv-trend-cross" />}
            <circle cx={points[shown].x} cy={points[shown].y} r={4.5} className="cv-trend-dot" />
          </svg>
          <p className="cv-trend-tip" aria-live="polite">
            <strong>{samples[shown].value}{unit}</strong> à {time.format(new Date(samples[shown].at))}
          </p>
        </div>
      )}
    </figure>
  );
}
