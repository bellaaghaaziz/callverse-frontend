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
        <div className="cv-supervision-chat cv-focused-workspace cv-cs-reveal" style={{ animationDelay: "60ms" }}>
          <SupervisedConversations refreshKey={refreshKey} onOpen={open} />
          <section className="cv-supervision-detail" id="conversation-panel" aria-label="Conversation ouverte" tabIndex={-1}>
          {selectedId ? (
            <ConversationPanel key={selectedId} id={selectedId} role="SUPERVISOR" />
          ) : <div className="cv-card cv-chat-empty"><h2>Ouvrez une conversation</h2><p>Choisissez un échange pour lire les messages et accompagner le client.</p></div>}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
