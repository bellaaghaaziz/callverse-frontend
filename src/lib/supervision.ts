// Query for GET /supervision/conversations (listSupervisedConversations).
import { skillLabel } from "./presentation";
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
