import { ArrowUpRight, Inbox, MessageSquare } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { skillLabel } from "@/lib/presentation";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";
import { useState } from "react";

// Queues to take the next contact from, and the conversations the advisor holds.
export default function AdvisorInbox({
  workspace,
}: {
  workspace: AdvisorWorkspace;
}) {
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState("live");
  const [view, setView] = useState("chats");
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
  const visible = myConversations.filter(conv =>
    (!skill || conv.skill === skill) &&
    (status === "all" || (status === "live" ? !["RESOLVED", "ABANDONED"].includes(conv.status) : conv.status === status)) &&
    `${customerNames[conv.customerId] || ""} ${conv.id} ${skillLabel[conv.skill] || conv.skill}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))
  );
  return (
    <section className="cv-card cv-inbox" aria-label="Files et conversations">
      <div className="cv-inbox-head">
        <h2>Boîte de réception</h2>
        <span className="cv-count">{myConversations.length}</span>
      </div>
      <div className="cv-inbox-switch" aria-label="Vue de la boîte de réception">
        <button type="button" aria-pressed={view === "chats"} onClick={() => setView("chats")}>Mes chats</button>
        <button type="button" aria-pressed={view === "queues"} onClick={() => setView("queues")}>Files · {queues.reduce((sum, queue) => sum + queue.waiting, 0)}</button>
      </div>
      {view === "queues" ? <div className="cv-queue-section cv-inbox-scroll">
        <p>PRENDRE LE PROCHAIN CONTACT</p>
        {queues.map((queue) => (
          <button
            key={queue.skill}
            disabled={busy}
            className="cv-queue-button"
            onClick={() => perform(async () => { await takeNext(queue.skill); setView("chats"); })}
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
      </div> : <>
      <div className="cv-inbox-filters">
        <input className="cv-input" aria-label="Rechercher mes chats" placeholder="Rechercher un client…" value={query} onChange={e => setQuery(e.target.value)} />
        <select className="cv-input" aria-label="File de mes chats" value={skill} onChange={e => setSkill(e.target.value)}><option value="">Toutes les files</option>{Object.entries(skillLabel).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
        <select className="cv-input" aria-label="Statut de mes chats" value={status} onChange={e => setStatus(e.target.value)}><option value="live">En cours</option><option value="ESCALATED">Escaladés</option><option value="all">Tous</option><option value="RESOLVED">Résolus</option><option value="ABANDONED">Terminés</option></select>
        <p className="cv-muted" role="status">{visible.length} conversation{visible.length > 1 ? "s" : ""}</p>
      </div>
      <div className="cv-conversation-list cv-inbox-scroll" tabIndex={0} aria-label="Liste de mes chats">
        {visible.map((conv) => (
          <button
            key={conv.id}
            className={
              "cv-conversation-item " +
              (activeConvId === conv.id ? "cv-conversation-selected" : "")
            }
            onClick={() => {
              setActiveConvId(conv.id);
              if (window.matchMedia("(max-width:900px)").matches) requestAnimationFrame(() => document.querySelector(".cv-chat-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }}
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
        {!visible.length && (
          <div className="cv-empty">
            <Inbox size={24} />
            <strong>Aucune conversation</strong>Modifiez les filtres ou prenez un contact dans l’onglet Files.
          </div>
        )}
      </div>
      </>}
    </section>
  );
}
