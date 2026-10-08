/** Placeholder block shaped like the content it stands for. Pulses only when motion is allowed. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-lg bg-white/[0.06] motion-safe:animate-pulse ${className}`} />;
}
