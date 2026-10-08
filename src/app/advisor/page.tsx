"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch, ApiError, errorMessage } from "@/lib/api";
import {
  mergeMessages,
  money,
  type Conversation,
  type Message,
  type Customer,
  type Schema,
  type ConversationEvent,
} from "@/lib/contracts";
import {
  FrontDesk,
  KnowledgeSearch,
  Incidents,
} from "@/components/IntegrationTools";
import { useConnection, useTopic } from "@/hooks/useTopic";
import { reconnectStomp } from "@/lib/stomp";
import { useQueueTopics } from "@/hooks/useQueueTopic";
import {
  Clock,
  Ticket,
  ArrowRightLeft,
  Send,
  User,
  ShieldAlert,
  Copy,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Inbox,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import ChatThread from "@/components/ChatThread";
import StatusBadge from "@/components/StatusBadge";
import {
  skillLabel,
  intentLabel,
  initialsFor,
  segmentLabel,
  durationLabel,
} from "@/lib/presentation";

type Queue = Schema["Queue"];
type Transaction = Schema["Transaction"];

export default function AdvisorPage() {
  const [myConversations, setMyConversations] = useState<Conversation[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>(
    {},
  );
  const customerIds = [...new Set(myConversations.map((c) => c.customerId))]
    .sort()
    .join(",");
  useEffect(() => {
    if (!customerIds) return;
    const controller = new AbortController();
    void Promise.allSettled(
      customerIds.split(",").map(async (id) => {
        const profile = await apiFetch<Customer>("/customers/" + id, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted)
          setCustomerNames((previous) => ({
            ...previous,
            [id]: profile.firstName + " " + profile.lastName,
          }));
      }),
    );
    return () => controller.abort();
  }, [customerIds]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [draft, setDraft] = useState("");
  const [activeNotification, setActiveNotification] = useState<string | null>(
    null,
  );
  const [elapsed, setElapsed] = useState(0);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticket, setTicket] = useState({
    title: "",
    description: "",
    category: "FRAUD",
    severity: 3,
  });
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const connection = useConnection();
  const latestEvent = useRef<{ id: string | null; at: string }>({
    id: null,
    at: "",
  });
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const activeConv = myConversations.find((c) => c.id === activeConvId) || null;

  const showToast = useCallback((msg: string) => {
    setActiveNotification(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setActiveNotification(null), 6000);
  }, []);

  const refreshMine = useCallback(async () => {
    const data = await apiFetch<Schema["ConversationList"]>(
      "/conversations/mine",
    );
    setMyConversations(data.conversations);
  }, []);
  const refreshQueues = useCallback(async () => {
    const data = await apiFetch<Schema["Queues"]>("/queues");
    setQueues(data.queues);
  }, []);
  useEffect(() => {
    const load = () => {
      Promise.all([refreshMine(), refreshQueues()]).catch((error) =>
        showToast(errorMessage(error)),
      );
    };
    load();
    window.addEventListener("callverse:reconnected", load);
    return () => window.removeEventListener("callverse:reconnected", load);
  }, [refreshMine, refreshQueues, showToast]);
  const selectedId = activeConv?.id;
  const selectedCustomerId = activeConv?.customerId;
  useEffect(() => {
    setMessages([]);
    setCustomer(null);
    setTransactions([]);
    setDraft("");
    setTicketOpen(false);
    setEscalationOpen(false);
    latestEvent.current = { id: selectedId || null, at: "" };
    if (!selectedId || !selectedCustomerId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const [transcript, profile, movements] = await Promise.all([
          apiFetch<Schema["Transcript"]>(
            "/conversations/" + selectedId + "/messages?limit=200",
            { signal: controller.signal },
          ),
          apiFetch<Customer>("/customers/" + selectedCustomerId, {
            signal: controller.signal,
          }),
          apiFetch<Schema["TransactionsResponse"]>(
            "/customers/" + selectedCustomerId + "/transactions?count=10",
            { signal: controller.signal },
          ),
        ]);
        if (!controller.signal.aborted) {
          setMessages((previous) =>
            mergeMessages(previous, transcript.messages),
          );
          setCustomer(profile);
          setTransactions(movements.transactions);
        }
      } catch (error) {
        if (!controller.signal.aborted) showToast(errorMessage(error));
      }
    };
    void load();
    window.addEventListener("callverse:reconnected", load);
    return () => {
      controller.abort();
      window.removeEventListener("callverse:reconnected", load);
    };
  }, [selectedId, selectedCustomerId, showToast]);
  async function perform(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showToast(errorMessage(error));
      if (error instanceof ApiError && error.status === 409)
        await refreshMine().catch(() => {});
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const selectedQueuedAt = activeConv?.queuedAt;
  // Chrono SLA côté client, calculé depuis queuedAt (jamais envoyé par le serveur)
  useEffect(() => {
    if (!selectedId || !selectedQueuedAt) return;
    const start = new Date(selectedQueuedAt).getTime();
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [selectedId, selectedQueuedAt]);

  useTopic<ConversationEvent>(
    selectedId ? "/topic/conversation/" + selectedId : null,
    (convEvent) => {
      if (convEvent.conversationId !== selectedId) return;
      if (
        convEvent.type === "MESSAGE_POSTED" &&
        convEvent.sender &&
        convEvent.messageId !== null &&
        convEvent.content !== null &&
        convEvent.sentAt
      ) {
        setMessages((previous) =>
          mergeMessages(previous, [
            {
              id: convEvent.messageId!,
              conversationId: convEvent.conversationId,
              sender: convEvent.sender!,
              content: convEvent.content!,
              sentAt: convEvent.sentAt!,
            },
          ]),
        );
      }
      if (
        latestEvent.current.id === convEvent.conversationId &&
        convEvent.occurredAt >= latestEvent.current.at
      ) {
        latestEvent.current.at = convEvent.occurredAt;
        setMyConversations((previous) =>
          previous
            .map((conversation) =>
              conversation.id === convEvent.conversationId
                ? { ...conversation, status: convEvent.status }
                : conversation,
            )
            .filter(
              (conversation) =>
                !["RESOLVED", "ABANDONED"].includes(conversation.status),
            ),
        );
      }
    },
  );
  useQueueTopics(
    queues.map((queue) => queue.skill),
    () => {
      refreshQueues().catch((error) => showToast(errorMessage(error)));
    },
  );

  async function takeNext(skill: string) {
    try {
      const result = await apiFetch<Conversation | null>(
        `/queues/${skill}/next`,
        { method: "POST" },
      );
      if (result) {
        await refreshMine();
        setActiveConvId(result.id);
        showToast("Contact pris en charge · " + (skillLabel[skill] || skill));
      } else {
        showToast(
          "Aucun contact en attente dans la file " +
            (skillLabel[skill] || skill) +
            ".",
        );
      }
    } catch (err) {
      throw err;
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!draft.trim() || !activeConv) return;
    const message = await apiFetch<Message>(
      `/conversations/${activeConv.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content: draft }),
      },
    );
    setMessages((previous) => mergeMessages(previous, [message]));
    await refreshMine();
    setDraft("");
    // Le message s'affichera via le topic temps réel (événement MESSAGE_POSTED)
  }

  async function handleBlockCard(cardId: string) {
    await apiFetch(`/cards/${cardId}/block`, {
      method: "POST",
      body: JSON.stringify({ reason: "FRAUD_SUSPECTED" }),
    });
    if (activeConv) {
      const d = await apiFetch<Customer>(`/customers/${activeConv.customerId}`);
      setCustomer(d);
    }
    showToast("Carte bloquée pour suspicion de fraude");
  }

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

  async function handleResolve() {
    if (!activeConv) return;
    await apiFetch(`/conversations/${activeConv.id}/resolve`, {
      method: "POST",
    });
    setActiveConvId(null);
    await refreshMine();
    showToast("Conversation résolue");
  }

  async function handleAbandon() {
    if (!activeConv) return;
    await apiFetch("/conversations/" + activeConv.id + "/abandon", {
      method: "POST",
    });
    setActiveConvId(null);
    await refreshMine();
    await refreshQueues();
    showToast("Conversation terminée : client parti.");
  }

  const customerName = customer
    ? customer.firstName + " " + customer.lastName
    : "Conversation client";
  const canReply =
    !!activeConv &&
    ["ASSIGNED", "ACTIVE", "ESCALATED"].includes(activeConv.status);
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
              ? "Flux live connecté"
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
        <section
          className="cv-card cv-inbox"
          aria-label="Files et conversations"
        >
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
            {!queues.length && (
              <p className="cv-muted">Chargement des files…</p>
            )}
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
                <strong>Tout est à jour</strong>Prenez un contact dans une file
                pour démarrer.
              </div>
            )}
          </div>
        </section>
        <section
          className="cv-card cv-chat-panel"
          aria-label="Conversation active"
        >
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
                      .then(() =>
                        showToast("Identifiant de conversation copié"),
                      )
                      .catch(() =>
                        showToast(
                          "La copie est indisponible dans ce navigateur.",
                        ),
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
                        aria-label="Message"
                        disabled={busy}
                        placeholder="Écrire un message à votre client…"
                        className="cv-input"
                        maxLength={2000}
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
                      <span>Votre message sera visible par le client.</span>
                      <span>{draft.length}/2000</span>
                    </p>
                  </>
                ) : (
                  <p>Cette conversation est en lecture seule.</p>
                )}
              </div>
              <div className="cv-chat-actions">
                <button
                  className="cv-button cv-button-secondary"
                  disabled={busy}
                  onClick={() => {
                    setTicketOpen(!ticketOpen);
                    setEscalationOpen(false);
                  }}
                >
                  <Ticket size={12} />
                  Ouvrir un ticket
                </button>
                <button
                  className="cv-button cv-button-secondary"
                  disabled={busy || activeConv.status !== "ACTIVE"}
                  onClick={() => {
                    setEscalationOpen(!escalationOpen);
                    setTicketOpen(false);
                  }}
                >
                  <ShieldAlert size={12} />
                  Escalader
                </button>
                <button
                  className="cv-button cv-button-secondary"
                  disabled={busy || activeConv.status !== "ACTIVE"}
                  onClick={() => perform(handleResolve)}
                >
                  <CheckCircle2 size={12} />
                  Résoudre la conversation
                </button>
                {["QUEUED", "ASSIGNED", "ACTIVE"].includes(
                  activeConv.status,
                ) && (
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
        <aside className="cv-customer-column">
          <section className="cv-card">
            {customer ? (
              <>
                <div className="cv-customer-header">
                  <span className="cv-avatar">{initialsFor(customerName)}</span>
                  <h2>{customerName}</h2>
                  <p>DOSSIER CLIENT · {customer.externalRef}</p>
                </div>
                <div className="cv-profile-section">
                  <h3>
                    Informations client <User size={13} />
                  </h3>
                  <dl className="cv-meta-list">
                    <div>
                      <dt>Segment</dt>
                      <dd>
                        {segmentLabel[customer.segment] || customer.segment}
                      </dd>
                    </div>
                    <div>
                      <dt>Région</dt>
                      <dd>{customer.region}</dd>
                    </div>
                    <div>
                      <dt>Ancienneté</dt>
                      <dd>{customer.tenureMonths} mois</dd>
                    </div>
                  </dl>
                </div>
                <div className="cv-profile-section">
                  <h3>
                    Comptes & cartes <CreditCard size={13} />
                  </h3>
                  {customer.accounts.map((account) => (
                    <div key={account.id} className="cv-account-card">
                      <p>{account.product.name}</p>
                      <strong>
                        {money(account.balance, account.currency)}
                      </strong>
                      <p>{account.maskedIban}</p>
                      <p className="mt-2">
                        Découvert :{" "}
                        {money(account.overdraftLimit, account.currency)}
                      </p>
                      <div className="mt-2">
                        <StatusBadge
                          status={account.status}
                          label={
                            account.status === "ACTIVE" ? "Actif" : undefined
                          }
                        />
                      </div>
                      {account.cards.map((card) => (
                        <div className="cv-bank-card" key={card.id}>
                          <p>•••• {card.panLast4}</p>
                          {card.status === "ACTIVE" ? (
                            <button
                              className="cv-button cv-button-danger"
                              disabled={busy}
                              onClick={() =>
                                perform(() => handleBlockCard(card.id))
                              }
                            >
                              Bloquer
                            </button>
                          ) : (
                            <StatusBadge status={card.status} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="cv-profile-section">
                  <h3>
                    Dernières opérations <ArrowRightLeft size={13} />
                  </h3>
                  {transactions.slice(0, 5).map((t) => (
                    <div className="cv-list-row" key={t.id}>
                      <div>
                        <strong>{t.label}</strong>
                      </div>
                      <span
                        className={t.amount < 0 ? "cv-negative" : "cv-positive"}
                      >
                        {money(t.amount, t.currency)}
                      </span>
                    </div>
                  ))}
                  {!transactions.length && (
                    <p className="cv-muted">Aucune opération récente.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="cv-empty">
                <User size={26} />
                <strong>Le contexte fait la différence.</strong>Les informations
                client apparaîtront avec votre conversation.
              </div>
            )}
          </section>
          {(ticketOpen || escalationOpen) && (
            <section className="cv-card cv-action-form">
              {ticketOpen ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void perform(handleOpenTicket);
                  }}
                >
                  <h3>Ouvrir un ticket</h3>
                  <label className="cv-field">
                    <span className="cv-label">Titre du ticket</span>
                    <input
                      aria-label="Titre du ticket"
                      required
                      minLength={3}
                      maxLength={140}
                      className="cv-input"
                      value={ticket.title}
                      onChange={(e) =>
                        setTicket({ ...ticket, title: e.target.value })
                      }
                    />
                  </label>
                  <label className="cv-field">
                    <span className="cv-label">Description du ticket</span>
                    <textarea
                      aria-label="Description du ticket"
                      required
                      minLength={5}
                      maxLength={4000}
                      className="cv-input"
                      value={ticket.description}
                      onChange={(e) =>
                        setTicket({ ...ticket, description: e.target.value })
                      }
                    />
                  </label>
                  <div className="cv-form-row">
                    <label className="cv-field">
                      <span className="cv-label">Catégorie du ticket</span>
                      <select
                        aria-label="Catégorie du ticket"
                        className="cv-input"
                        value={ticket.category}
                        onChange={(e) =>
                          setTicket({ ...ticket, category: e.target.value })
                        }
                      >
                        {["FRAUD", "CARD", "CREDIT", "ACCOUNT", "OTHER"].map(
                          (value) => (
                            <option key={value} value={value}>
                              {
                                (
                                  {
                                    FRAUD: "Fraude",
                                    CARD: "Carte",
                                    CREDIT: "Crédit",
                                    ACCOUNT: "Compte",
                                    OTHER: "Autre",
                                  } as Record<string, string>
                                )[value]
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="cv-field">
                      <span className="cv-label">Gravité du ticket</span>
                      <select
                        aria-label="Gravité du ticket"
                        className="cv-input"
                        value={ticket.severity}
                        onChange={(e) =>
                          setTicket({
                            ...ticket,
                            severity: Number(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value} / 5
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="cv-button"
                      disabled={
                        busy ||
                        !ticket.title.trim() ||
                        !ticket.description.trim()
                      }
                    >
                      Créer le ticket
                    </button>
                    <button
                      type="button"
                      className="cv-button cv-button-secondary"
                      onClick={() => setTicketOpen(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void perform(handleEscalate);
                  }}
                >
                  <h3>Demander une intervention</h3>
                  <p className="cv-subtitle mb-4">
                    Le superviseur recevra votre demande avec le contexte de la
                    conversation.
                  </p>
                  <label className="cv-field">
                    <span className="cv-label">Motif d’escalade</span>
                    <textarea
                      aria-label="Motif d’escalade"
                      required
                      minLength={3}
                      maxLength={2000}
                      className="cv-input"
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      className="cv-button"
                      disabled={busy || !escalationReason.trim()}
                    >
                      Confirmer l’escalade
                    </button>
                    <button
                      type="button"
                      className="cv-button cv-button-secondary"
                      onClick={() => setEscalationOpen(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </aside>
      </div>
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
