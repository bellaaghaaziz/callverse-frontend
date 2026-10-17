"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleHelp, Compass, X } from "lucide-react";
import { hasSeenTour, markTourSeen, tourForPath, tourLayout, tourStorageKey, type TourRect } from "@/lib/guided-tour";

function localStorageOrNull() {
  try { return window.localStorage; } catch { return null; }
}
function findTarget(selector: string) {
  // Our selectors are simple comma-separated alternatives, in priority order.
  for (const alternative of selector.split(",")) {
    const target = Array.from(document.querySelectorAll<HTMLElement>(alternative.trim())).find(element => {
      const style = getComputedStyle(element);
      return element.getClientRects().length > 0 && style.visibility !== "hidden" &&
        style.display !== "none" && !element.closest('[aria-hidden="true"]');
    });
    if (target) return target;
  }
  return null;
}

export default function GuidedTour() {
  const pathname = usePathname();
  const definition = useMemo(() => tourForPath(pathname), [pathname]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [geometry, setGeometry] = useState<{ rect: TourRect | null; width: number; height: number; cardHeight: number }>({ rect: null, width: 1024, height: 768, cardHeight: 300 });
  const dialog = useRef<HTMLDivElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const storageKey = useRef<string | null>(null);
  const context = useRef<{ focus: HTMLElement | null; x: number; y: number; path: string } | null>(null);
  const id = useId().replace(/:/g, "");
  const start = useCallback(() => {
    if (!definition) return;
    context.current = {
      focus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      x: window.scrollX, y: window.scrollY, path: pathname,
    };
    setIndex(0); setOpen(true);
  }, [definition, pathname]);
  const close = useCallback(() => {
    if (storageKey.current) markTourSeen(localStorageOrNull(), storageKey.current);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!definition || open) return;
    let key: string | null = null;
    try { key = tourStorageKey(JSON.parse(sessionStorage.getItem("user") || "null"), definition.scope); } catch {}
    storageKey.current = key;
    // This component mounts inside SessionGuard, after /auth/me has verified the account.
    // Version 1 has no existing completion records, so old accounts see the guide too.
    if (!key || hasSeenTour(localStorageOrNull(), key)) return;
    const timer = setTimeout(start, 650);
    return () => clearTimeout(timer);
  }, [definition, start, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const app = document.querySelector<HTMLElement>(".cv-app");
    const previousInert = app?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const launchButton = launch.current;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    dialog.current?.focus({ preventScroll: true });
    if (app) app.inert = true;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    return () => {
      if (app) app.inert = previousInert;
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      const saved = context.current;
      if (!saved || location.pathname !== saved.path) return;
      requestAnimationFrame(() => {
        if (location.pathname !== saved.path) return;
        window.scrollTo({ left: saved.x, top: saved.y, behavior: "instant" });
        const target = saved.focus?.isConnected && saved.focus !== document.body ? saved.focus : launchButton;
        target?.focus({ preventScroll: true });
      });
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !definition) return;
    const current = definition.steps[index];
    let frame = 0;
    let scrolledTo: HTMLElement | null = null;
    let observedTarget: HTMLElement | null = null;
    const observer = new ResizeObserver(() => schedule());
    function measure() {
      const target = findTarget(current.target);
      if (target && target !== scrolledTo) {
        target.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
        scrolledTo = target;
      }
      if (target !== observedTarget) {
        if (observedTarget) observer.unobserve(observedTarget);
        if (target) observer.observe(target);
        observedTarget = target;
      }
      const width = window.innerWidth, height = window.innerHeight;
      const box = target?.getBoundingClientRect();
      let rect: TourRect | null = null;
      if (box) {
        const x = Math.max(4, box.left - 8), y = Math.max(4, box.top - 8);
        const right = Math.min(width - 4, box.right + 8), bottom = Math.min(height - 4, box.bottom + 8);
        if (right > x && bottom > y) rect = { x, y, width: right - x, height: bottom - y };
      }
      const next = { rect, width, height, cardHeight: dialog.current?.getBoundingClientRect().height ?? 300 };
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
    const main = document.querySelector(".cv-main");
    const mutations = new MutationObserver(schedule);
    if (main) mutations.observe(main, { childList: true, subtree: true });
    if (dialog.current) observer.observe(dialog.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect();
      window.removeEventListener("resize", schedule); window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [open, definition, index]);

  useEffect(() => {
    if (!open || !definition) return;
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key === "ArrowRight" && index < definition!.steps.length - 1) { event.preventDefault(); setIndex(i => Math.min(definition!.steps.length - 1, i + 1)); }
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); setIndex(i => Math.max(0, i - 1)); }
      if (event.key !== "Tab") return;
      const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]') ?? []);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!dialog.current?.contains(document.activeElement) || document.activeElement === dialog.current) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown, true);
    return () => document.removeEventListener("keydown", keydown, true);
  }, [open, definition, index, close]);

  if (!definition) return null;
  const current = definition.steps[index];
  const position = tourLayout(geometry.rect, geometry, { width: 370, height: geometry.cardHeight });
  return <>
    <button ref={launch} type="button" className="cv-tour-launch cv-button cv-button-secondary cv-button-small" data-tour="help" aria-label="Guide d’utilisation : relancer la visite de cette page" onClick={start}>
      <CircleHelp size={17} /><span>Guide</span>
    </button>
    {open && createPortal(<div className="cv-tour" data-tour-overlay="true">
      <svg className="cv-tour-overlay" width="100%" height="100%" viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs><mask id={`tour-mask-${id}`}><rect width={geometry.width} height={geometry.height} fill="white" />
          {geometry.rect && <rect {...geometry.rect} rx="14" fill="black" />}
        </mask></defs>
        <rect width={geometry.width} height={geometry.height} fill="#001d19" fillOpacity="0.8" mask={`url(#tour-mask-${id})`} />
        {geometry.rect && <rect {...geometry.rect} rx="14" fill="none" stroke="#7ce5c0" strokeWidth="2" />}
      </svg>
      <div ref={dialog} className="cv-tour-dialog" data-tour-step={current.id} role="dialog" aria-modal="true" aria-labelledby={`tour-title-${id}`} aria-describedby={`tour-body-${id}`} tabIndex={-1}
        style={{ left: position.x, top: position.y, width: position.width }}>
        <div className="cv-tour-heading"><span className="cv-tour-brand"><Compass size={17} /> LE GUIDE CALLVERSE</span>
          <button type="button" className="cv-tour-close" aria-label="Quitter la visite guidée" onClick={close}><X size={19} /></button></div>
        <p className="cv-tour-counter" aria-live="polite">Étape {index + 1} sur {definition.steps.length}</p>
        <h2 id={`tour-title-${id}`}>{current.title}</h2>
        <p id={`tour-body-${id}`} className="cv-tour-body">{current.body}</p>
        {!geometry.rect && <p className="cv-tour-hint">Cette zone n’est pas affichée pour le moment. Vous pouvez poursuivre la visite.</p>}
        <div className="cv-tour-progress" aria-hidden="true"><span style={{ width: `${(index + 1) / definition.steps.length * 100}%` }} /></div>
        <div className="cv-tour-actions"><button type="button" className="cv-tour-skip" onClick={close}>Passer la visite</button>
          <div>{index > 0 && <button type="button" className="cv-tour-back" aria-label="Précédent" onClick={() => setIndex(i => Math.max(0, i - 1))}><ArrowLeft size={15} /><span>Précédent</span></button>}
            <button type="button" className="cv-tour-next" onClick={() => index === definition.steps.length - 1 ? close() : setIndex(i => Math.min(definition.steps.length - 1, i + 1))}>
              {index === definition.steps.length - 1 ? "Terminer" : "Suivant"}<ArrowRight size={15} /></button></div>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
