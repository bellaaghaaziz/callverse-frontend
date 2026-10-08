"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, MessageSquare } from "lucide-react";
import type { Message, Role } from "@/lib/contracts";
import { initialsFor, roleLabel, timeLabel } from "@/lib/presentation";
function dayLabel(time: string) {
  const date = new Date(time);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd’hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
export default function ChatThread({
  messages,
  role,
  customerName = "Client",
  loading = false,
}: {
  messages: Message[];
  role: Role;
  customerName?: string;
  loading?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const previousCount = useRef(0);
  const [unread, setUnread] = useState(false);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (atBottom.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (atBottom.current) {
      element.scrollTop = element.scrollHeight;
      setUnread(false);
    } else if (messages.length > previousCount.current) setUnread(true);
    previousCount.current = messages.length;
  }, [messages]);
  function scrollToBottom() {
    if (viewport.current) {
      viewport.current.scrollTop = viewport.current.scrollHeight;
      atBottom.current = true;
      setUnread(false);
    }
  }
  return (
    <div className="cv-thread-wrap">
      <div
        ref={viewport}
        role="log"
        aria-label="Messages de la conversation"
        aria-live="polite"
        aria-relevant="additions"
        className="cv-thread"
        onScroll={() => {
          const element = viewport.current;
          if (element) {
            atBottom.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              70;
            if (atBottom.current) setUnread(false);
          }
        }}
      >
        {loading && (
          <div className="cv-chat-empty">
            <span className="cv-loader" />
            <p>Chargement des messages…</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="cv-chat-empty">
            <span className="cv-empty-icon">
              <MessageSquare size={24} />
            </span>
            <h3>La conversation commence ici.</h3>
            <p>Les nouveaux messages apparaîtront ici en temps réel.</p>
          </div>
        )}
        {messages.map((message, index) => {
          const own = message.sender === role;
          const name =
            message.sender === "CUSTOMER"
              ? customerName
              : message.sender === "ADVISOR"
                ? "Conseiller"
                : "Information";
          const day = dayLabel(message.sentAt);
          const newDay =
            index === 0 || dayLabel(messages[index - 1].sentAt) !== day;
          const grouped =
            !newDay &&
            index > 0 &&
            messages[index - 1].sender === message.sender;
          return (
            <div key={message.id}>
              {newDay && (
                <div className="cv-day-separator">
                  <span>{day}</span>
                </div>
              )}
              {message.sender === "SYSTEM" ? (
                <p className="cv-system-message">{message.content}</p>
              ) : (
                <div
                  className={
                    "cv-message-row " +
                    (own ? "cv-message-own" : "") +
                    (grouped ? " cv-message-grouped" : "")
                  }
                >
                  <span
                    className={
                      "cv-message-avatar " + (grouped ? "invisible" : "")
                    }
                    aria-hidden="true"
                  >
                    {initialsFor(name)}
                  </span>
                  <div className="cv-message-body">
                    {!grouped && (
                      <p className="cv-message-name">
                        {own ? "Vous" : name}
                        <span>
                          {own || name === roleLabel[message.sender]
                            ? ""
                            : " · " + roleLabel[message.sender]}
                        </span>
                      </p>
                    )}
                    <div className="cv-message-bubble">
                      <p>{message.content}</p>
                      <time dateTime={message.sentAt}>
                        {timeLabel(message.sentAt)}
                      </time>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {unread && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="cv-unread-button"
        >
          <ArrowDown size={14} />
          Nouveaux messages
        </button>
      )}
    </div>
  );
}
