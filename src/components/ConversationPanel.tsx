"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import {
  mergeMessages,
  type Conversation,
  type ConversationEvent,
  type Message,
  type Role,
  type Schema,
} from "@/lib/contracts";
import { useTopic, useConnection } from "@/hooks/useTopic";
import ChatThread from "./ChatThread";
import StatusBadge from "./StatusBadge";
import { MessageSquare, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { reconnectStomp } from "@/lib/stomp";
export default function ConversationPanel({
  id,
  role,
}: {
  id: string;
  role: Role;
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const latestStatus = useRef("");
  const connection = useConnection();
  const loaded = conversation !== null;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const eventVersion = latestStatus.current;
      try {
        const [record, transcript] = await Promise.all([
          apiFetch<Conversation>(`/conversations/${id}`, {
            signal: controller.signal,
          }),
          apiFetch<Schema["Transcript"]>(
            `/conversations/${id}/messages?limit=200`,
            { signal: controller.signal },
          ),
        ]);
        if (!controller.signal.aborted) {
          setError("");
          setConversation((previous) =>
            latestStatus.current === eventVersion
              ? record
              : previous
                ? { ...record, status: previous.status }
                : record,
          );
          setMessages((previous) =>
            mergeMessages(previous, transcript.messages),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(errorMessage(error));
      }
    }
    void load();
    window.addEventListener("callverse:reconnected", load);
    return () => {
      controller.abort();
      window.removeEventListener("callverse:reconnected", load);
    };
  }, [id, loaded]);
  useTopic<ConversationEvent>(
    conversation ? "/topic/conversation/" + id : null,
    (event) => {
      if (event.conversationId !== id) return;
      if (
        event.type === "MESSAGE_POSTED" &&
        event.messageId !== null &&
        event.sender &&
        event.content !== null &&
        event.sentAt
      ) {
        setMessages((previous) =>
          mergeMessages(previous, [
            {
              id: event.messageId!,
              conversationId: id,
              sender: event.sender!,
              content: event.content!,
              sentAt: event.sentAt!,
            },
          ]),
        );
      }
      if (event.occurredAt >= latestStatus.current) {
        latestStatus.current = event.occurredAt;
        setConversation((previous) =>
          previous ? { ...previous, status: event.status } : previous,
        );
      }
    },
  );
  const canWrite =
    !!conversation &&
    (role === "CUSTOMER"
      ? !["RESOLVED", "ABANDONED"].includes(conversation.status)
      : role === "ADVISOR" &&
        ["ASSIGNED", "ACTIVE", "ESCALATED"].includes(conversation.status));
  const canAbandon =
    !!conversation &&
    ["QUEUED", "ASSIGNED", "ACTIVE"].includes(conversation.status);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      const message = await apiFetch<Message>(`/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: draft.trim() }),
      });
      setMessages((previous) => mergeMessages(previous, [message]));
      setDraft("");
      setConversation(await apiFetch<Conversation>(`/conversations/${id}`));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function close(action: "resolve" | "abandon") {
    setBusy(true);
    setError("");
    try {
      setConversation(
        await apiFetch<Conversation>(`/conversations/${id}/${action}`, {
          method: "POST",
        }),
      );
    } catch (error) {
      setError(errorMessage(error));
      try {
        setConversation(await apiFetch<Conversation>(`/conversations/${id}`));
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="cv-card">
      <div className="cv-chat-header">
        <div className="cv-chat-person">
          <span className="cv-avatar cv-avatar-light">
            <MessageSquare size={16} />
          </span>
          <div>
            <strong>Votre conversation</strong>
            <p className="cv-key" title={id}>
              Référence {id}
            </p>
          </div>
        </div>
        <div className="cv-chat-status">
          {conversation && <StatusBadge status={conversation.status} />}
          <span
            className={
              "cv-live " + (connection !== "connected" ? "cv-live-off" : "")
            }
          >
            {connection === "connected" ? "En direct" : "Connexion interrompue"}
          </span>
        </div>
      </div>
      {connection !== "connected" && (
        <div className="px-5 py-3">
          <button
            className="cv-button cv-button-secondary cv-button-small"
            onClick={reconnectStomp}
          >
            <RefreshCw size={12} />
            Reconnecter le flux live
          </button>
        </div>
      )}
      {error && (
        <div className="cv-error m-4" role="alert">
          {error}
        </div>
      )}
      <div className="flex flex-col h-[420px] min-h-0">
        <ChatThread
          messages={messages}
          role={role}
          loading={!conversation && !error}
        />
      </div>
      {canWrite ? (
        <div className="cv-composer">
          <form onSubmit={send}>
            <input
              aria-label="Message"
              disabled={busy}
              placeholder="Écrire un message…"
              className="cv-input"
              maxLength={2000}
              required
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button disabled={busy || !draft.trim()} className="cv-button">
              <Send size={14} />
              Envoyer
            </button>
          </form>
          <p>
            <span>
              Votre échange est visible par le conseiller et le client.
            </span>
            <span>{draft.length}/2000</span>
          </p>
        </div>
      ) : (
        conversation && (
          <div className="cv-notice m-4">
            {["RESOLVED", "ABANDONED"].includes(conversation.status)
              ? "Cet échange est terminé. Vous pouvez relire vos messages."
              : "Vous consultez cet échange en lecture seule."}
          </div>
        )
      )}
      {((role === "SUPERVISOR" && conversation?.status === "ESCALATED") ||
        canAbandon) && (
        <div className="cv-chat-actions">
          {role === "SUPERVISOR" && conversation?.status === "ESCALATED" && (
            <button
              disabled={busy}
              onClick={() => close("resolve")}
              className="cv-button"
            >
              <CheckCircle2 size={13} />
              Résoudre l’escalade
            </button>
          )}
          {canAbandon && (
            <button
              disabled={busy}
              onClick={() => close("abandon")}
              className="cv-button cv-button-danger"
            >
              Terminer — client parti
            </button>
          )}
        </div>
      )}
    </section>
  );
}
