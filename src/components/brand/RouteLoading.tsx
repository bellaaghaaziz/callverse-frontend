import CallVerseMark from "@/components/brand/CallVerseMark";
import { Skeleton } from "@/components/ui/Skeleton";

/** Shown while a workspace route loads: the app shell's shape plus the mark. */
export default function RouteLoading() {
  return (
    <main className="flex h-screen gap-3 bg-[#07090e] p-3" role="status" aria-label="Chargement…">
      <Skeleton className="hidden w-16 shrink-0 rounded-2xl sm:block" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/5">
          <div className="flex flex-col items-center gap-3 text-xs text-slate-400">
            <CallVerseMark size={48} tone="dark" className="motion-safe:animate-pulse" />
            <span>Chargement…</span>
          </div>
        </div>
      </div>
    </main>
  );
}
