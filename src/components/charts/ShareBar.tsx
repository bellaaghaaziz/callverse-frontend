"use client";
import { shareSegments } from "@/lib/charts";

// Part-to-whole on one stacked bar. Colours are a fixed, validated categorical order
// (dataviz validator: all six checks pass on white); identity never relies on colour alone,
// every segment is in the legend with its count and share.
export const SHARE_COLORS = ["#0f9b76", "#b9790c", "#5a62d8", "#cf4a6a"];

export default function ShareBar({ title, parts }: {
  title: string;
  parts: { key: string; label: string; value: number }[];
}) {
  const segments = shareSegments(parts);
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <figure className="cv-chart">
      <figcaption className="cv-chart-title">{title} <span className="cv-chart-total">{total} au total</span></figcaption>
      <div className="cv-share" aria-hidden="true">
        {total === 0 ? <span className="cv-share-empty" /> : segments.map((segment, index) => segment.percent > 0 && (
          <span key={segment.key} className="cv-share-segment" title={`${parts[index].label} : ${segment.value} (${segment.label})`}
            style={{ width: `${segment.percent}%`, background: SHARE_COLORS[index % SHARE_COLORS.length], animationDelay: `${index * 90}ms` }} />
        ))}
      </div>
      <ul className="cv-legend">
        {segments.map((segment, index) => (
          <li key={segment.key}>
            <span className="cv-legend-swatch" style={{ background: SHARE_COLORS[index % SHARE_COLORS.length] }} aria-hidden="true" />
            <span>{parts[index].label}</span>
            <strong>{segment.value}</strong>
            <span className="cv-legend-share">{segment.label}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
