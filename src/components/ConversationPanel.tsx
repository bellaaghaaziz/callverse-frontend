"use client";
import { useEffect, useId, useRef, useState } from "react";
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
import { MessageSquare, RefreshCw, Send, CheckCircle2, Sparkles } from "lucide-react";
import { reconnectStomp } from "@/lib/stomp";
import QualityCard from "./ai/QualityCard";
import { intentLabel, skillLabel } from "@/lib/presentation";
export default function ConversationPanel({
  id,
  role,
  heading,
  onDelete,
  onStatus,
}: {
  id: string;
  role: Role;
  // The customer's space heads the chat with the advisor and the subject.
  heading?: { title: string; subtitle: string };
  // Customer only: removes the conversation from their space (the parent confirms first).
  onDelete?: () => void;
  onStatus?: (status: Conversation["status"]) => void;
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const helpId = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyState, setReplyState] = useState<"idle" | "waiting" | "delayed">("idle");
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
              ? previous && previous.status === record.status && previous.advisorId === record.advisorId && previous.endedAt === record.endedAt ? previous : record
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
    // Continue receiving human replies and late escalation events if realtime is unavailable.
    const timer = role === "CUSTOMER" && connection !== "connected"
      ? setInterval(() => void load(), 5000) : undefined;
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("callverse:reconnected", load);
    };
  }, [id, loaded, role, connection]);
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
              aiGenerated: event.aiGenerated === true,
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
      : (role === "ADVISOR" && ["ASSIGNED", "ACTIVE", "ESCALATED"].includes(conversation.status)) ||
        (role === "SUPERVISOR" && conversation.status === "ESCALATED"));
  const canAbandon =
    !!conversation &&
    ["QUEUED", "ASSIGNED", "ACTIVE"].includes(conversation.status);
  const canDelete = role === "CUSTOMER" && !!onDelete && !!conversation && conversation.status !== "ESCALATED";
  const status = conversation?.status;
  useEffect(() => {
    if (status) onStatus?.(status);
  }, [status, onStatus]);
  const lastMessage = messages.at(-1);
  const humanHasReplied = messages.some(message => message.sender === "ADVISOR" && !message.aiGenerated);
  useEffect(() => {
    if (role === "CUSTOMER" && conversation) {
      window.dispatchEvent(new CustomEvent("callverse:conversation-updated", { detail: id }));
    }
  }, [id, role, conversation, lastMessage?.id]);
  useEffect(() => {
    if (role !== "CUSTOMER" || !canWrite || lastMessage?.sender !== "CUSTOMER") {
      setReplyState("idle");
      return;
    }
    const deadline = Date.parse(lastMessage.sentAt) + 90000;
    if (Date.now() >= deadline) { setReplyState("delayed"); return; }
    setReplyState("waiting");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function followReply() {
      if (Date.now() >= deadline) { setReplyState("delayed"); return; }
      try {
        const eventVersion = latestStatus.current;
        const [transcript, record] = await Promise.all([
          apiFetch<Schema["Transcript"]>(`/conversations/${id}/messages?limit=200`, { signal: controller.signal }),
          apiFetch<Conversation>(`/conversations/${id}`, { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setMessages(previous => mergeMessages(previous, transcript.messages));
        if (latestStatus.current === eventVersion) setConversation(previous => previous?.status === record.status ? previous : record);
      } catch { /* Keep the chat usable during a temporary connection failure. */ }
      if (!controller.signal.aborted) timer = setTimeout(() => void followReply(), 3000);
    }
    timer = setTimeout(() => void followReply(), 3000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [id, role, canWrite, lastMessage?.id, lastMessage?.sender, lastMessage?.sentAt]);
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
    <section className="cv-card cv-conversation-panel">
      <div className="cv-chat-header">
        <div className="cv-chat-person">
          <span className="cv-avatar cv-avatar-light">
            <MessageSquare size={16} />
          </span>
          <div>
            <strong>{heading?.title || "Votre conversation"}</strong>
            <p>{heading ? heading.subtitle + (conversation ? " · " + new Date(conversation.queuedAt).toLocaleString("fr-FR") : "")
              : conversation ? new Date(conversation.queuedAt).toLocaleString("fr-FR") : "Chargement de l’échange…"}</p>
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
      {role !== "CUSTOMER" && conversation && <div className="cv-chat-context"><span>{skillLabel[conversation.skill] || conversation.skill}</span><span>{intentLabel[conversation.intent || ""] || "Demande client"}</span></div>}
      {role === "CUSTOMER" && canWrite && <div className="cv-chat-context" role="status">
        {humanHasReplied ? "Votre conseiller a pris le relais." : conversation?.status === "ESCALATED" ? "Un spécialiste a été demandé. L’assistant IA reste avec vous en attendant." : "L’assistant IA vous accompagne. Un conseiller peut prendre le relais."}
      </div>}
      {connection !== "connected" && (
        <div className="px-5 py-3">
          <button
            className="cv-button cv-button-secondary cv-button-small"
            onClick={reconnectStomp}
          >
            <RefreshCw size={12} />
            Reconnecter le flux en direct
          </button>
        </div>
      )}
      {error && (
        <div className="cv-error m-4" role="alert">
          {error}
        </div>
      )}
      {(role === "SUPERVISOR" || role === "ADMIN") && conversation?.status === "RESOLVED" && (
        <details className="cv-quality-detail"><summary>Analyse qualité IA</summary><QualityCard conversationId={id} status={conversation.status} /></details>
      )}
      <div className="cv-conversation-transcript flex flex-col h-[420px] min-h-0">
        <ChatThread
          messages={messages}
          role={role}
          loading={!conversation && !error}
        />
      </div>
      {role === "CUSTOMER" && replyState !== "idle" && <div className="cv-reply-status" role="status">
        {humanHasReplied ? <MessageSquare size={14} /> : <Sparkles size={14} />}
        {humanHasReplied ? "Votre message est envoyé. En attente de votre conseiller." : replyState === "waiting" ? "L’assistant IA prépare votre réponse…" : "Votre message est enregistré. La réponse prend plus de temps que prévu."}
        {replyState === "delayed" && <button className="cv-button cv-button-secondary cv-button-small" onClick={() => {
          void apiFetch<Schema["Transcript"]>(`/conversations/${id}/messages?limit=200`)
            .then(transcript => setMessages(previous => mergeMessages(previous, transcript.messages)))
            .catch(error => setError(errorMessage(error)));
        }}>Actualiser l’échange</button>}
      </div>}
      {canWrite ? (
        <div className="cv-composer">
          <form onSubmit={send}>
            <input
              aria-label="Message"
              aria-describedby={helpId}
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
            <span id={helpId}>
              {role === "CUSTOMER" ? "Votre message reste dans cette discussion." : "Votre échange est visible par le conseiller et le client."}
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
        canAbandon || canDelete) && (
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
              className={role === "CUSTOMER" ? "cv-button cv-button-secondary" : "cv-button cv-button-danger"}
            >
              {role === "CUSTOMER" ? "Terminer l’échange" : "Terminer — client parti"}
            </button>
          )}
          {canDelete && (
            <button type="button" disabled={busy} onClick={onDelete} className="cv-button cv-button-danger">
              Supprimer la conversation
            </button>
          )}
        </div>
      )}
    </section>
  );
}
