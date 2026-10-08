import { statusLabel } from "@/lib/presentation";
export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = ["ACTIVE", "RESOLVED"].includes(status)
    ? "green"
    : ["ASSIGNED", "QUEUED"].includes(status)
      ? "amber"
      : ["ESCALATED", "BLOCKED"].includes(status)
        ? "rose"
        : "gray";
  return (
    <span className={"cv-badge cv-badge-" + tone}>
      <span className="cv-status-dot" />
      {label || statusLabel[status] || status}
    </span>
  );
}
