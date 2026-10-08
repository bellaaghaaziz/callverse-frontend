import { CORE_COLOR, MARK, MARK_ARCS, arcPath } from "@/components/brand/markGeometry";

export interface CallVerseMarkProps {
  size?: number;
  /** Background the mark sits on: the core dot changes for contrast. */
  tone?: "light" | "dark";
  /** Accessible name; omit when the mark is decorative. */
  title?: string;
  className?: string;
}

/** Static CallVerse mark (placeholder until the official logo). Server-safe. */
export default function CallVerseMark({ size = 40, tone = "dark", title, className }: CallVerseMarkProps) {
  return (
    <svg
      viewBox={`0 0 ${MARK.size} ${MARK.size}`}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {MARK_ARCS.map((arc) => (
        <path
          key={arc.startDeg}
          d={arcPath(arc.startDeg, arc.endDeg)}
          fill="none"
          stroke={arc.color}
          strokeWidth={MARK.stroke}
        />
      ))}
      <circle cx={MARK.cx} cy={MARK.cy} r={MARK.coreR} fill={CORE_COLOR[tone]} />
    </svg>
  );
}
