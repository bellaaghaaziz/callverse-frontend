"use client";
import { barWidths } from "@/lib/charts";

// Magnitude across a few named items: one hue, values written at the end of each bar,
// a hover title per bar, and a table for screen readers.
export default function BarList({ title, items, unit = "", empty = "Aucune donnée pour le moment.", format }: {
  title: string;
  items: { key: string; label: string; value: number; detail?: string }[];
  unit?: string;
  empty?: string;
  format?: (value: number) => string;
}) {
  const show = (value: number) => (format ? format(value) : `${value}${unit}`);
  const widths = barWidths(items.map(item => item.value), 100);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <figure className="cv-chart">
      <figcaption className="cv-chart-title">{title}</figcaption>
      {items.length === 0 || total === 0 ? <p className="cv-chart-empty">{empty}</p> : (
        <ul className="cv-bars" aria-hidden="true">
          {items.map((item, index) => (
            <li key={item.key} title={`${item.label} : ${show(item.value)}${item.detail ? " · " + item.detail : ""}`}>
              <span className="cv-bars-label">{item.label}</span>
              <span className="cv-bars-track">
                <span className="cv-bars-fill" style={{ width: `${widths[index]}%`, animationDelay: `${index * 70}ms` }} />
              </span>
              <span className="cv-bars-value">{show(item.value)}</span>
            </li>
          ))}
        </ul>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>{items.map(item => <tr key={item.key}><th scope="row">{item.label}</th><td>{show(item.value)}{item.detail ? ", " + item.detail : ""}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
