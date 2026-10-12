"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import type { SupervisedConversationPage } from "@/lib/contracts";
import {
  LIVE_STATUSES,
  invalidRange,
  supervisionQuery,
} from "@/lib/supervision";
import { durationLabel, skillLabel } from "@/lib/presentation";
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
}: {
  // Changes whenever the live KPI or alert feed reports activity.
  refreshKey: string;
  onOpen: (id: string) => void;
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
      <div className="cv-table-wrap">
        <table className="cv-table cv-conv-table">
          <caption className="sr-only">
            Conversations supervisées, page {page + 1} sur {totalPages}
          </caption>
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Statut</th>
              <th scope="col">File</th>
              <th scope="col">Conseiller</th>
              <th scope="col">Arrivée</th>
              <th scope="col">Attente</th>
              <th scope="col">Délai cible</th>
              <th scope="col">Messages</th>
              <th scope="col">Dernier message</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {current?.content.map((conversation) => (
              <tr key={conversation.id}>
                <td>
                  <strong className="cv-conv-name">
                    {conversation.customer.name}
                  </strong>
                  {conversation.customer.reference && (
                    <p className="cv-conv-ref">
                      {conversation.customer.reference}
                    </p>
                  )}
                </td>
                <td>
                  <div className="cv-conv-status">
                    <StatusBadge status={conversation.status} />
                    {conversation.pendingEscalation && (
                      <span className="cv-badge cv-badge-rose">
                        Escalade en attente
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {conversation.skill
                    ? skillLabel[conversation.skill] || conversation.skill
                    : "—"}
                </td>
                <td>{conversation.advisor?.name ?? "—"}</td>
                <td>{dateTime.format(new Date(conversation.queuedAt))}</td>
                <td>
                  {conversation.waitSeconds == null
                    ? "—"
                    : durationLabel(Math.round(conversation.waitSeconds))}
                </td>
                <td>
                  {conversation.slaMet == null
                    ? "—"
                    : conversation.slaMet
                      ? "Respecté"
                      : "Dépassé"}
                </td>
                <td>{conversation.messageCount}</td>
                <td>
                  {conversation.lastMessageAt
                    ? dateTime.format(new Date(conversation.lastMessageAt))
                    : "—"}
                </td>
                <td>
                  {/* One action per row: a named button, not a ⋮ menu. */}
                  <button
                    className="cv-icon-button cv-row-open"
                    aria-label={
                      "Ouvrir la conversation de " + conversation.customer.name
                    }
                    onClick={() => onOpen(conversation.id)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
