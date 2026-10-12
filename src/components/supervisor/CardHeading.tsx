import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Card heading of the supervisor dashboard: icon well, title, sub-copy, then a
// count chip or an action at the right.
export default function CardHeading({
  icon: Icon,
  title,
  subtitle,
  live = false,
  count,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: ReactNode;
  // The sub-copy reports a changing state (announced politely).
  live?: boolean;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="cv-card-heading">
      <span className="cv-card-icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div>
        <h2>{title}</h2>
        <p role={live ? "status" : undefined}>{subtitle}</p>
      </div>
      {count !== undefined && <span className="cv-count">{count}</span>}
      {action}
    </div>
  );
}
