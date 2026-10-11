import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError, errorMessage } from "@/lib/api";
import {
  mergeMessages,
  type Conversation,
  type Message,
  type Customer,
  type Schema,
  type ConversationEvent,
} from "@/lib/contracts";
import { useConnection, useTopic } from "@/hooks/useTopic";
import { useQueueTopics } from "@/hooks/useQueueTopic";
import { useCustomerNames } from "@/hooks/useCustomerNames";
import {
  canReply as canReplyTo,
  customerDisplayName,
  messageFromEvent,
  takeNextNotice,
  withEventStatus,
} from "@/lib/advisor";

type Queue = Schema["Queue"];
type Transaction = Schema["Transaction"];

// The advisor's workspace: held conversations, queues, the open conversation
// with its customer, live updates, the busy guard and the actions.
export function useAdvisorWorkspace() {
  const [myConversations, setMyConversations] = useState<Conversation[]>([]);
  const customerNames = useCustomerNames(myConversations);
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
      const message = messageFromEvent(convEvent);
      if (message)
        setMessages((previous) => mergeMessages(previous, [message]));
      if (
        latestEvent.current.id === convEvent.conversationId &&
        convEvent.occurredAt >= latestEvent.current.at
      ) {
        latestEvent.current.at = convEvent.occurredAt;
        setMyConversations((previous) =>
          withEventStatus(previous, convEvent.conversationId, convEvent.status),
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
    const result = await apiFetch<Conversation | null>(
      `/queues/${skill}/next`,
      { method: "POST" },
    );
    if (result) {
      await refreshMine();
      setActiveConvId(result.id);
    }
    showToast(takeNextNotice(skill, !!result));
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

  const customerName = customerDisplayName(customer);
  const canReply = canReplyTo(activeConv?.status);
  return {
    myConversations,
    customerNames,
    queues,
    activeConvId,
    setActiveConvId,
    activeConv,
    selectedId,
    selectedCustomerId,
    messages,
    customer,
    customerName,
    transactions,
    draft,
    setDraft,
    activeNotification,
    elapsed,
    busy,
    connection,
    canReply,
    showToast,
    refreshMine,
    refreshQueues,
    perform,
    takeNext,
    handleSendMessage,
    handleBlockCard,
    handleResolve,
    handleAbandon,
  };
}

export type AdvisorWorkspace = ReturnType<typeof useAdvisorWorkspace>;
