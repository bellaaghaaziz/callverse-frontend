"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A thin progress bar under the banner from the click on an internal link until the new page is
// on screen: the feedback banking apps give between screens. Decorative for screen readers,
// which hear the new page heading instead.
export default function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const started = useRef("");
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement).closest("a");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      started.current = window.location.pathname + window.location.search;
      setState("loading");
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, []);
  useEffect(() => {
    if (state !== "loading") return;
    if (window.location.pathname + window.location.search === started.current) return;
    setState("done");
    const timer = setTimeout(() => setState("idle"), 450);
    return () => clearTimeout(timer);
  }, [pathname, state]);
  return <div className={"cv-route-progress cv-route-progress-" + state} aria-hidden="true"><span /></div>;
}
