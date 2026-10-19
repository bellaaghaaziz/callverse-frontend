"use client";

import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { reconnectStomp } from "@/lib/stomp";
import { useEffect } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useAdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";
import { useActionForms } from "@/hooks/useActionForms";
import AdvisorInbox from "@/components/advisor/Inbox";
import AdvisorChatPanel from "@/components/advisor/ChatPanel";
import AdvisorCustomerColumn from "@/components/advisor/CustomerColumn";
import AdvisorActionForms from "@/components/advisor/ActionForms";
import AdvisorActivity from "@/components/advisor/AdvisorActivity";
import WorkspaceTabs from "@/components/WorkspaceTabs";
import AssistantPanel from "@/components/advisor/AssistantPanel";

export default function AdvisorPage() {
  const workspace = useAdvisorWorkspace();
  const {
    activeConv,
    customer,
    activeNotification,
    connection,
    busy,
    perform,
    showToast,
    refreshMine,
    refreshQueues,
    selectedId,
    selectedCustomerId,
  } = workspace;
  const forms = useActionForms(busy, selectedId, selectedCustomerId);
  // « Mes conversations » sends a live conversation here to be worked on.
  const { setActiveConvId } = workspace;
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("conversation");
    if (!wanted) return;
    window.history.replaceState(null, "", "/advisor");
    void refreshMine().then(() => setActiveConvId(wanted)).catch(() => {});
  }, [refreshMine, setActiveConvId]);
  const {
    ticket,
    setTicket,
    setTicketOpen,
    escalationReason,
    setEscalationOpen,
  } = forms;

  async function handleOpenTicket() {
    if (!activeConv) return;
    await apiFetch("/tickets", {
      method: "POST",
      body: JSON.stringify({
        customerId: activeConv.customerId,
        conversationId: activeConv.id,
        category: ticket.category,
        title: ticket.title.trim(),
        description: ticket.description.trim(),
        severity: ticket.severity,
      }),
    });
    setTicketOpen(false);
    setTicket({ title: "", description: "", category: "FRAUD", severity: 3 });
    showToast(
      `Nouveau ticket ouvert pour ${customer?.firstName ?? "le client"}`,
    );
  }

  async function handleEscalate() {
    if (!activeConv) return;
    await apiFetch(`/conversations/${activeConv.id}/escalations`, {
      method: "POST",
      body: JSON.stringify({ reason: escalationReason.trim() }),
    });
    await refreshMine();
    setEscalationOpen(false);
    showToast("Dossier escaladé au superviseur en charge");
  }

  return (
    <AppShell role="Conseiller" initials="CO" title="Poste de travail">
      {activeNotification && (
        <div className="cv-toast" role="status">
          <CheckCircle2 size={17} />
          {activeNotification}
        </div>
      )}
      <div className="cv-page-heading" id="workspace">
        <div>
          <p className="cv-eyebrow">RELATION CLIENT</p>
          <h1>Votre espace de travail</h1>
          <p className="cv-subtitle">
            Des échanges clairs. Les bonnes informations, au bon moment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              "cv-live " + (connection !== "connected" ? "cv-live-off" : "")
            }
          >
            {connection === "connected"
              ? "Flux en direct connecté"
              : "Connexion interrompue"}
          </span>
          <button
            className="cv-icon-button"
            aria-label="Actualiser les conversations"
            disabled={busy}
            onClick={() =>
              perform(async () => {
                reconnectStomp();
                await refreshMine();
                await refreshQueues();
              })
            }
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <details className="cv-activity-disclosure"><summary>Mon activité et les files</summary><AdvisorActivity workspace={workspace} /></details>
      <div id="workspace-chat" className="cv-advisor-grid cv-focused-workspace">
        <AdvisorInbox workspace={workspace} />
        <AdvisorChatPanel workspace={workspace} forms={forms} />
        <div className="cv-context-column"><WorkspaceTabs tabs={[
          { id: "context", label: "Contexte", content: <AdvisorCustomerColumn workspace={workspace} /> },
          { id: "assistant", label: "Assistant IA", content: <AssistantPanel workspace={workspace} /> },
        ]} /></div>
      </div>
      <AdvisorActionForms workspace={workspace} forms={forms} handleOpenTicket={handleOpenTicket} handleEscalate={handleEscalate} />
    </AppShell>
  );
}
