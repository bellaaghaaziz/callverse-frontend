"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import type { SupervisedConversationPage } from "@/lib/contracts";
import {
  LIVE_STATUSES,
  invalidRange,
  supervisionQuery,
  waitLabel,
} from "@/lib/supervision";
import { skillLabel } from "@/lib/presentation";
import StatusBadge from "@/components/StatusBadge";
import { ArrowUpRight, MessageSquare, RefreshCw } from "lucide-react";
import CardHeading from "./CardHeading";
import ConversationFilters from "./ConversationFilters";
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const statusesFor = (choice: string) =>
  choice === "live"
    ? LIVE_STATUSES
    : choice === "escalated"
      ? ["ESCALATED"]
      : choice === "all"
        ? []
        : [choice];
export default function SupervisedConversations({
  refreshKey,
  onOpen,
  selectedId,
}: {
  // Changes whenever the live KPI or alert feed reports activity.
  refreshKey: string;
  onOpen: (id: string) => void;
  selectedId?: string | null;
}) {
  // Each result remembers the query it answers, so rows from other filters
  // never show under the current ones (for example after a failed request).
  const [data, setData] = useState<{
    params: string;
    result: SupervisedConversationPage;
  } | null>(null);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState("live");
  const [skill, setSkill] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const params = supervisionQuery({
    statuses: statusesFor(choice),
    skill,
    q: search,
    from,
    to,
    page,
  });
  const rangeInvalid = invalidRange(from, to);
  const current = data?.params === params ? data.result : null;
  useEffect(() => {
    const reconnected = () => setReload((value) => value + 1);
    window.addEventListener("callverse:reconnected", reconnected);
    return () =>
      window.removeEventListener("callverse:reconnected", reconnected);
  }, []);
  // Live activity refetches at most once every 1.5 s; later events in the
  // window do not push it back, so a busy floor cannot starve the list.
  const lastKey = useRef(refreshKey);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (refreshKey === lastKey.current) return;
    lastKey.current = refreshKey;
    if (liveTimer.current) return;
    liveTimer.current = setTimeout(() => {
      liveTimer.current = null;
      setReload((value) => value + 1);
    }, 1500);
  }, [refreshKey]);
  useEffect(
    () => () => {
      if (liveTimer.current) clearTimeout(liveTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (rangeInvalid) return;
    // A newer request aborts the older one, so a stale page never wins.
    const controller = new AbortController();
    apiFetch<SupervisedConversationPage>(
      `/supervision/conversations?${params}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setData({ params, result });
        setError("");
        const lastPage = Math.max(0, result.page.totalPages - 1);
        if (page > lastPage) setPage(lastPage);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, [params, page, rangeInvalid, reload]);
  const update = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(0);
  };
  const totalPages = Math.max(1, current?.page.totalPages || 0);
  return (
    <section className="cv-section cv-card" id="conversation">
      <CardHeading
        icon={MessageSquare}
        title="Conversations"
        live
        subtitle={
          current
            ? current.page.totalElements +
              " conversation" +
              (current.page.totalElements > 1 ? "s" : "") +
              " · les plus récentes d’abord"
            : error || rangeInvalid
              ? "Liste indisponible"
              : "Chargement des conversations…"
        }
        action={
          <button
            className="cv-icon-button"
            aria-label="Actualiser les conversations"
            onClick={() => setReload((value) => value + 1)}
          >
            <RefreshCw size={16} />
          </button>
        }
      />
      <ConversationFilters
        query={query}
        onQuery={setQuery}
        onSearch={() => update(setSearch)(query)}
        choice={choice}
        onChoice={update(setChoice)}
        skill={skill}
        onSkill={update(setSkill)}
        from={from}
        onFrom={update(setFrom)}
        to={to}
        onTo={update(setTo)}
      />
      {rangeInvalid ? (
        <p role="alert" className="cv-error cv-conv-error">
          « Arrivées avant » doit être postérieure à « Arrivées depuis ».
        </p>
      ) : (
        error && (
          <p role="alert" className="cv-error cv-conv-error">
            {error}
          </p>
        )
      )}
      <div className="cv-supervised-list" tabIndex={0} aria-label="Conversations de l’équipe">
        {current?.content.map(conversation => <button type="button" key={conversation.id}
          className={"cv-supervised-item" + (selectedId === conversation.id ? " cv-directory-selected" : "")}
          aria-pressed={selectedId === conversation.id} onClick={() => onOpen(conversation.id)}
          aria-label={"Ouvrir la conversation de " + conversation.customer.name}>
          <span className="cv-directory-heading"><strong>{conversation.customer.name}</strong><ArrowUpRight size={15} /></span>
          <span className="cv-directory-heading"><StatusBadge status={conversation.status} /><span className="cv-muted">{conversation.skill ? skillLabel[conversation.skill] || conversation.skill : "Relation client"}</span></span>
          <span className="cv-muted">{conversation.advisor?.name ?? "En attente d’un conseiller"} · {conversation.messageCount} message{conversation.messageCount > 1 ? "s" : ""}</span>
          <span className="cv-muted">Attente {waitLabel(conversation.waitSeconds)}{conversation.slaMet === false ? " · Délai dépassé" : ""}</span>
          {conversation.pendingEscalation && <span className="cv-badge cv-badge-rose">Escalade en attente</span>}
          <span className="cv-muted">{dateTime.format(new Date(conversation.lastMessageAt || conversation.queuedAt))}</span>
        </button>)}
      </div>
      {current?.content.length === 0 && (
        <div className="cv-empty">
          <MessageSquare size={24} />
          <strong>Aucun résultat</strong>Essayez un autre filtre ou une autre
          recherche.
        </div>
      )}
      <div className="cv-pager">
        <span className="cv-muted">
          Page {page + 1} / {totalPages}
        </span>
        <div>
          <button
            className="cv-button cv-button-secondary cv-button-small"
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Précédent
          </button>
          <button
            className="cv-button cv-button-secondary cv-button-small"
            disabled={!current || page + 1 >= current.page.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Suivant
          </button>
        </div>
      </div>
    </section>
  );
}
