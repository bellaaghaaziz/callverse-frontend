"use client";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ConversationPanel from "@/components/ConversationPanel";
import SupervisedConversations from "@/components/supervisor/SupervisedConversations";
import { useTopic } from "@/hooks/useTopic";
import type { LiveKpi } from "@/lib/contracts";

// Every live conversation on its own page: the filterable list, then the one opened.
// The list refreshes whenever the live KPI changes, i.e. after any conversation event.
export default function SupervisorConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState("");
  useTopic<LiveKpi>("/topic/supervision/kpi", useCallback((kpi: LiveKpi) => setRefreshKey(kpi.at), []));
  const open = useCallback((id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      const panel = document.getElementById("conversation-panel");
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("open");
    if (!wanted) return;
    window.history.replaceState(null, "", "/supervisor/conversations");
    open(wanted);
  }, [open]);
  return (
    <AppShell role="Superviseur" initials="SV" title="Conversations">
      <div className="cv-supervisor">
        <div className="cv-page-heading cv-cs-reveal">
          <div>
            <p className="cv-eyebrow">CONVERSATIONS</p>
            <h1>Toutes les conversations en direct</h1>
            <p className="cv-subtitle">Filtrez, repérez les escalades, ouvrez un échange.</p>
          </div>
        </div>
        <div className="cv-cs-reveal" style={{ animationDelay: "60ms" }}>
          <SupervisedConversations refreshKey={refreshKey} onOpen={open} />
        </div>
        {selectedId && (
          <section className="cv-section cv-cs-reveal" id="conversation-panel" aria-label="Conversation ouverte" tabIndex={-1}>
            <ConversationPanel key={selectedId} id={selectedId} role="SUPERVISOR" />
          </section>
        )}
      </div>
    </AppShell>
  );
}
