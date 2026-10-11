import { ArrowUpRight, Inbox, MessageSquare } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { skillLabel } from "@/lib/presentation";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";

// Queues to take the next contact from, and the conversations the advisor holds.
export default function AdvisorInbox({
  workspace,
}: {
  workspace: AdvisorWorkspace;
}) {
  const {
    myConversations,
    customerNames,
    queues,
    activeConvId,
    setActiveConvId,
    busy,
    perform,
    takeNext,
  } = workspace;
  return (
    <section className="cv-card cv-inbox" aria-label="Files et conversations">
      <div className="cv-inbox-head">
        <h2>Boîte de réception</h2>
        <span className="cv-count">{myConversations.length}</span>
      </div>
      <div className="cv-queue-section">
        <p>PRENDRE LE PROCHAIN CONTACT</p>
        {queues.map((queue) => (
          <button
            key={queue.skill}
            disabled={busy}
            className="cv-queue-button"
            onClick={() => perform(() => takeNext(queue.skill))}
            aria-label={skillLabel[queue.skill] + " " + queue.waiting}
          >
            <span>
              <span
                className={
                  "cv-status-dot " +
                  (queue.skill === "FRAUD"
                    ? "text-rose-400"
                    : "text-emerald-600")
                }
              />
              {skillLabel[queue.skill] || queue.skill}
            </span>
            <span>
              <b>{queue.waiting}</b>
              <ArrowUpRight size={12} />
            </span>
          </button>
        ))}
        {!queues.length && <p className="cv-muted">Chargement des files…</p>}
      </div>
      <div className="cv-conversation-list">
        {myConversations.map((conv) => (
          <button
            key={conv.id}
            className={
              "cv-conversation-item " +
              (activeConvId === conv.id ? "cv-conversation-selected" : "")
            }
            onClick={() => setActiveConvId(conv.id)}
            disabled={busy}
            aria-pressed={activeConvId === conv.id}
          >
            <span className="cv-avatar">
              <MessageSquare size={14} />
            </span>
            <div>
              <strong>
                {customerNames[conv.customerId] ||
                  "Contact · " + conv.id.slice(0, 6)}
              </strong>
              <p>{skillLabel[conv.skill] || conv.skill}</p>
              <StatusBadge status={conv.status} />
            </div>
          </button>
        ))}
        {!myConversations.length && (
          <div className="cv-empty">
            <Inbox size={24} />
            <strong>Tout est à jour</strong>Prenez un contact dans une file pour
            démarrer.
          </div>
        )}
      </div>
    </section>
  );
}
