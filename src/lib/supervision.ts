// Query for GET /supervision/conversations (listSupervisedConversations).
import { durationLabel, skillLabel } from "./presentation";
export const SUPERVISED_STATUSES = [
  "QUEUED",
  "ASSIGNED",
  "ACTIVE",
  "ESCALATED",
  "RESOLVED",
  "ABANDONED",
];
export const LIVE_STATUSES = ["QUEUED", "ASSIGNED", "ACTIVE", "ESCALATED"];
export interface SupervisionFilters {
  statuses: string[];
  skill: string;
  q: string;
  // datetime-local values, read in the browser's time zone
  from: string;
  to: string;
  page: number;
  size?: number;
}
const isoOrNull = (value: string) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};
// Alerts carry only the customer's id: show the name once loaded, a short reference before.
export const alertCustomerLabel = (customerId?: string, name?: string) =>
  name
    ? "Client : " + name
    : customerId
      ? "Client · " + customerId.slice(0, 8)
      : "Client";
// KPI and queue figures: « — » until the backend has a measure. Waits under an
// hour carry their units; longer ones read as durationLabel (« 3 j 21 h »).
export function waitLabel(seconds?: number | null) {
  if (seconds == null) return "—";
  const total = Math.max(0, Math.round(seconds));
  if (total >= 3600) return durationLabel(total);
  const minutes = Math.floor(total / 60);
  return (minutes ? minutes + " min " : "") + (total % 60) + " s";
}
export const percentLabel = (value?: number | null) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
// The backend rejects a range whose end is not after its start (400).
export function invalidRange(from: string, to: string): boolean {
  const start = isoOrNull(from);
  const end = isoOrNull(to);
  return !!start && !!end && end <= start;
}
export function supervisionQuery(filters: SupervisionFilters): string {
  const params = new URLSearchParams();
  filters.statuses
    .filter((status) => SUPERVISED_STATUSES.includes(status))
    .forEach((status) => params.append("status", status));
  if (Object.prototype.hasOwnProperty.call(skillLabel, filters.skill))
    params.set("skill", filters.skill);
  const q = filters.q.trim();
  if (q) params.set("q", q);
  const from = isoOrNull(filters.from);
  if (from) params.set("from", from);
  const to = isoOrNull(filters.to);
  if (to) params.set("to", to);
  params.set("page", String(filters.page));
  params.set("size", String(Math.min(100, Math.max(1, filters.size ?? 20))));
  return params.toString();
}
