"use client";

import AppShell from "@/components/AppShell";
import { apiFetch, errorMessage } from "@/lib/api";
import {
  FrontDesk,
  KnowledgeSearch,
  Incidents,
} from "@/components/IntegrationTools";
import { reconnectStomp } from "@/lib/stomp";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useAdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";
import { useActionForms } from "@/hooks/useActionForms";
import AdvisorInbox from "@/components/advisor/Inbox";
import AdvisorChatPanel from "@/components/advisor/ChatPanel";
import AdvisorCustomerColumn from "@/components/advisor/CustomerColumn";
import AdvisorActionForms from "@/components/advisor/ActionForms";
import ConversationHistory from "@/components/advisor/ConversationHistory";
import SupportDesk from "@/components/SupportDesk";

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
    <AppShell role="Conseiller" initials="CO" title="Espace de travail">
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
      <div className="cv-advisor-grid">
        <AdvisorInbox workspace={workspace} />
        <AdvisorChatPanel workspace={workspace} forms={forms} />
        <AdvisorCustomerColumn workspace={workspace}>
          <AdvisorActionForms
            workspace={workspace}
            forms={forms}
            handleOpenTicket={handleOpenTicket}
            handleEscalate={handleEscalate}
          />
        </AdvisorCustomerColumn>
      </div>
      <ConversationHistory workspace={workspace} />
      <SupportDesk role="ADVISOR" customerId={selectedCustomerId} conversationId={selectedId} />
      <div className="cv-section">
        <div className="cv-section-title">
          <h2>Vos outils, à portée de main</h2>
          <p>Pour accompagner chaque demande</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div id="frontdesk" className="scroll-mt-6">
            <FrontDesk
              onOpened={() => {
                void refreshQueues().catch((e) => showToast(errorMessage(e)));
              }}
            />
          </div>
          <div id="knowledge" className="scroll-mt-6">
            <KnowledgeSearch />
          </div>
        </div>
        <div id="incidents" className="cv-section">
          <Incidents region={customer?.region} />
        </div>
      </div>
    </AppShell>
  );
}
