import { useRef } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  MessageSquare,
  Send,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import ChatThread from "@/components/ChatThread";
import StatusBadge from "@/components/StatusBadge";
import { MESSAGE_MAX_LENGTH } from "@/lib/contracts";
import {
  durationLabel,
  initialsFor,
  intentLabel,
  skillLabel,
} from "@/lib/presentation";
import { canAbandon, canEscalate, canResolve } from "@/lib/advisor";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";
import type { ActionForms } from "@/hooks/useActionForms";

// The open conversation: header, transcript, reply suggestion, composer and actions.
export default function AdvisorChatPanel({
  workspace,
  forms,
}: {
  workspace: AdvisorWorkspace;
  forms: ActionForms;
}) {
  const {
    activeConv,
    customerName,
    messages,
    elapsed,
    showToast,
    canReply,
    busy,
    draft,
    setDraft,
    perform,
    handleSendMessage,
    handleResolve,
    handleAbandon,
  } = workspace;
  const {
    ticketButton,
    escalationButton,
    returnFocus,
    ticketOpen,
    setTicketOpen,
    escalationOpen,
    setEscalationOpen,
  } = forms;
  const composerInput = useRef<HTMLInputElement>(null);
  return (
    <section className="cv-card cv-chat-panel" aria-label="Conversation active">
      {activeConv ? (
        <>
          <div className="cv-chat-header">
            <div className="cv-chat-person">
              <span className="cv-avatar cv-avatar-light">
                {initialsFor(customerName)}
              </span>
              <div>
                <strong>{customerName}</strong>
                <p>
                  {intentLabel[activeConv.intent || ""] ||
                    skillLabel[activeConv.skill] ||
                    "Relation client"}
                </p>
              </div>
            </div>
            <div className="cv-chat-status">
              <StatusBadge status={activeConv.status} />
              <span className="cv-muted">{messages.length} messages</span>
            </div>
          </div>
          <div className="cv-chat-context">
            <span>
              <Clock size={12} />
              Depuis la mise en file · {durationLabel(elapsed)}
            </span>
            <button
              className="flex items-center gap-1"
              title="Copier l’identifiant de conversation"
              onClick={() => {
                navigator.clipboard
                  .writeText(activeConv.id)
                  .then(() => showToast("Identifiant de conversation copié"))
                  .catch(() =>
                    showToast("La copie est indisponible dans ce navigateur."),
                  );
              }}
            >
              <Copy size={11} />
              Référence {activeConv.id.slice(0, 8)}
            </button>
          </div>
          <ChatThread
            key={activeConv.id}
            messages={messages}
            role="ADVISOR"
            customerName={customerName}
          />
          {canReply && <p className="cv-notice m-4">Lorsqu’il est disponible, le conseiller IA répond directement dans cet échange après un message client. Relisez les derniers messages avant d’envoyer votre réponse.</p>}
          <div className="cv-composer">
            {canReply ? (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void perform(() => handleSendMessage());
                  }}
                >
                  <input
                    ref={composerInput}
                    aria-label="Message"
                    aria-describedby="composer-help"
                    disabled={busy}
                    placeholder="Écrire un message à votre client…"
                    className="cv-input"
                    maxLength={MESSAGE_MAX_LENGTH}
                    required
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button
                    className="cv-button"
                    disabled={busy || !draft.trim()}
                  >
                    <Send size={15} />
                    <span>Envoyer</span>
                  </button>
                </form>
                <p>
                  <span id="composer-help">
                    Votre message sera visible par le client.
                  </span>
                  <span>
                    {draft.length}/{MESSAGE_MAX_LENGTH}
                  </span>
                </p>
              </>
            ) : (
              <p>Cette conversation est en lecture seule.</p>
            )}
          </div>
          <div className="cv-chat-actions">
            <button
              ref={ticketButton}
              className="cv-button cv-button-secondary"
              disabled={busy}
              aria-expanded={ticketOpen}
              onClick={() => {
                returnFocus.current = ticketButton.current;
                setTicketOpen(!ticketOpen);
                setEscalationOpen(false);
              }}
            >
              <Ticket size={12} />
              Ouvrir un ticket
            </button>
            <button
              ref={escalationButton}
              className="cv-button cv-button-secondary"
              disabled={busy || !canEscalate(activeConv.status)}
              aria-expanded={escalationOpen}
              onClick={() => {
                returnFocus.current = escalationButton.current;
                setEscalationOpen(!escalationOpen);
                setTicketOpen(false);
              }}
            >
              <ShieldAlert size={12} />
              Escalader
            </button>
            <button
              className="cv-button cv-button-secondary"
              disabled={busy || !canResolve(activeConv.status)}
              onClick={() => perform(handleResolve)}
            >
              <CheckCircle2 size={12} />
              Résoudre la conversation
            </button>
            {canAbandon(activeConv.status) && (
              <button
                className="cv-button cv-button-danger"
                disabled={busy}
                onClick={() => perform(handleAbandon)}
              >
                Terminer — client parti
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="cv-chat-empty">
          <span className="cv-empty-icon">
            <MessageSquare size={25} />
          </span>
          <h3>Chaque échange commence ici.</h3>
          <p>
            Sélectionnez une conversation ou prenez
            <br />
            le prochain contact dans une file.
          </p>
        </div>
      )}
    </section>
  );
}
