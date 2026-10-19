"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// Keep panels mounted: drafts, selected conversations and live feeds survive navigation.
export default function WorkspaceTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const prefix = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reveal = (id: string) => {
      if (id === "workspace" && !root.current?.closest("[data-workspace-panel]")) {
        setActive(root.current?.querySelector<HTMLElement>("[data-workspace-panel]")?.dataset.workspacePanel || "chats");
        return;
      }
      const target = document.getElementById(id);
      let panel = target?.closest<HTMLElement>("[data-workspace-panel]");
      while (panel && panel.parentElement !== root.current) panel = panel.parentElement?.closest<HTMLElement>("[data-workspace-panel]");
      if (!panel || !root.current?.contains(panel)) return;
      setActive(panel.dataset.workspacePanel!);
      requestAnimationFrame(() => target?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    const navigate = (event: Event) => reveal((event as CustomEvent<string>).detail);
    const hash = () => reveal(decodeURIComponent(window.location.hash.slice(1)));
    window.addEventListener("callverse:navigate", navigate);
    window.addEventListener("hashchange", hash);
    hash();
    return () => {
      window.removeEventListener("callverse:navigate", navigate);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  return <div ref={root} className="cv-workspace-tabs">
    <div className="cv-workspace-tabbar" role="tablist" aria-label="Rubriques de votre espace">
      {tabs.map((tab, index) => <button key={tab.id} id={`${prefix}-tab-${tab.id}`} role="tab" type="button"
        aria-selected={active === tab.id} aria-controls={`${prefix}-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1}
        onClick={() => setActive(tab.id)} onKeyDown={event => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
          else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = tabs.length - 1;
          else return;
          event.preventDefault(); setActive(tabs[next].id);
          document.getElementById(`${prefix}-tab-${tabs[next].id}`)?.focus();
        }}>{tab.label}</button>)}
    </div>
    {tabs.map(tab => <div key={tab.id} id={`${prefix}-panel-${tab.id}`} role="tabpanel" tabIndex={0}
      aria-labelledby={`${prefix}-tab-${tab.id}`} data-workspace-panel={tab.id} hidden={active !== tab.id}>{tab.content}</div>)}
  </div>;
}
