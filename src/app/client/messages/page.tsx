"use client";
import { useCallback, useEffect, useState } from "react";
import { MessageSquare, MessageSquarePlus, Trash2, X } from "lucide-react";
import ConversationPanel from "@/components/ConversationPanel";
import ConfirmDialog from "@/components/customer/ConfirmDialog";
import StatusBadge from "@/components/StatusBadge";
import type { ConversationChoice } from "@/components/ConversationPicker";
import { apiFetch, errorMessage } from "@/lib/api";
import type { Conversation } from "@/lib/contracts";
import { conversationHeading, openConversationConflict, requestTopics } from "@/lib/customer";

const LIVE = ["QUEUED", "ASSIGNED", "ACTIVE", "ESCALATED"];
const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// The customer's messaging: their conversations headed by the advisor and the subject,
// one live conversation at a time, and removal from their space after a confirmation.
export default function ClientMessages() {
  const [items, setItems] = useState<ConversationChoice[] | null>(null);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [topic, setTopic] = useState<string>(requestTopics[0].id);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");
  const [conflictId, setConflictId] = useState("");
  const [toDelete, setToDelete] = useState<ConversationChoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const page = await apiFetch<{ content: ConversationChoice[] }>("/conversations/accessible?page=0", { signal });
      if (!signal?.aborted) { setItems(page.content); setListError(""); }
    } catch (e) { if (!signal?.aborted) setListError(errorMessage(e)); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const params = new URLSearchParams(window.location.search);
    if (params.get("nouveau") === "1") setComposing(true);
    const wanted = params.get("conversation");
    if (wanted) setSelected(wanted);
    if (params.size) window.history.replaceState(null, "", "/client/messages");
    const refresh = () => void load();
    window.addEventListener("callverse:reconnected", refresh);
    return () => { controller.abort(); window.removeEventListener("callverse:reconnected", refresh); };
  }, [load]);
  const live = items?.find(item => LIVE.includes(item.status)) || null;
  const current = items?.find(item => item.id === selected) || null;
  const onStatus = useCallback(() => { void load(); }, [load]);

  async function openRequest(e: React.FormEvent) {
    e.preventDefault();
    if (opening) return;
    const chosen = requestTopics.find(t => t.id === topic) || requestTopics[0];
    setOpening(true); setOpenError(""); setConflictId(""); setNotice("");
    try {
      const conversation = await apiFetch<Conversation>("/me/conversations", {
        method: "POST", body: JSON.stringify({ skill: chosen.skill, intent: chosen.intent }),
      });
      setComposing(false);
      setSelected(conversation.id);
      setNotice("Votre demande est enregistrée. Écrivez votre message : un conseiller ou l’assistant vous répond ici.");
      await load();
    } catch (error) {
      const open = openConversationConflict(error);
      if (open !== null) setConflictId(open || live?.id || "");
      setOpenError(errorMessage(error));
    } finally { setOpening(false); }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true); setDeleteError("");
    try {
      await apiFetch(`/me/conversations/${toDelete.id}`, { method: "DELETE" });
      if (selected === toDelete.id) setSelected(null);
      setToDelete(null);
      setNotice("La conversation a été supprimée de votre espace.");
      await load();
    } catch (error) { setDeleteError(errorMessage(error)); } finally { setDeleting(false); }
  }

  return (
    <div className="cv-cs-stack">
      <section className="cv-cs-page-head cv-cs-page-head-row cv-cs-reveal" data-tour="client-welcome">
        <div>
          <p className="cv-cs-eyebrow">Messagerie</p>
          <h1>Vos échanges avec la banque</h1>
          <p className="cv-cs-lead">Un conseiller ou notre assistant vous répond ici, en direct.</p>
        </div>
        <button type="button" className="cv-button" data-tour="client-new" aria-expanded={composing}
          onClick={() => { setComposing(open => !open); setOpenError(""); setConflictId(""); }}>
          <MessageSquarePlus size={18} aria-hidden="true" />Nouvelle demande
        </button>
      </section>

      <div role="status">{notice && <p className="cv-notice cv-cs-reveal">{notice}</p>}</div>

      {composing && (
        <section className="cv-cs-card cv-cs-compose cv-cs-reveal" aria-labelledby="compose-title">
          <div className="cv-cs-card-head">
            <h2 id="compose-title">Quel est le sujet de votre demande ?</h2>
            <button type="button" className="cv-icon-button" aria-label="Fermer" onClick={() => setComposing(false)}><X size={18} /></button>
          </div>
          <form onSubmit={openRequest}>
            <fieldset className="cv-cs-topics" disabled={opening}>
              <legend className="sr-only">Sujet de la demande</legend>
              {requestTopics.map(t => (
                <label key={t.id} className={"cv-cs-topic" + (topic === t.id ? " cv-cs-topic-selected" : "")}>
                  <input type="radio" name="topic" value={t.id} checked={topic === t.id} onChange={() => setTopic(t.id)} />
                  <strong>{t.label}</strong><span>{t.hint}</span>
                </label>
              ))}
            </fieldset>
            {openError && (
              <div className="cv-cs-conflict" role="alert">
                <p>{openError}</p>
                {conflictId && <button type="button" className="cv-button cv-button-secondary" onClick={() => { setSelected(conflictId); setComposing(false); setOpenError(""); }}>
                  Reprendre ma conversation en cours
                </button>}
              </div>
            )}
            <button className="cv-button" disabled={opening}>{opening ? "Ouverture…" : "Commencer la conversation"}</button>
          </form>
        </section>
      )}

      <div className="cv-cs-messaging">
        <section className="cv-cs-card cv-cs-conversations" aria-labelledby="conversations-title" data-tour="client-conversations">
          <div className="cv-cs-card-head"><h2 id="conversations-title">Mes conversations</h2></div>
          {listError && <p role="alert" className="cv-error">{listError}</p>}
          {items === null && !listError && <p className="cv-muted">Chargement…</p>}
          {items?.length === 0 && <p className="cv-muted">Vous n’avez pas encore de conversation. Cliquez sur « Nouvelle demande » pour écrire à la banque.</p>}
          <ul>
            {items?.map(item => {
              const heading = conversationHeading(item);
              return (
                <li key={item.id} className={"cv-cs-conversation" + (selected === item.id ? " cv-cs-conversation-selected" : "")}>
                  <button type="button" className="cv-cs-conversation-open" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                    <span className="cv-cs-conversation-head"><strong>{heading.title}</strong><StatusBadge status={item.status} /></span>
                    <span className="cv-cs-conversation-subject">{heading.subtitle} · {when.format(new Date(item.queuedAt))}</span>
                    <span className="cv-cs-conversation-preview">{item.preview || "Aucun message pour le moment."}</span>
                  </button>
                  {item.status !== "ESCALATED" && (
                    <button type="button" className="cv-icon-button cv-cs-conversation-delete" aria-label={`Supprimer la conversation « ${heading.subtitle} »`}
                      onClick={() => { setDeleteError(""); setToDelete(item); }}>
                      <Trash2 size={17} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <div data-tour="client-chat">
          {selected ? (
            <ConversationPanel key={selected} id={selected} role="CUSTOMER" onStatus={onStatus}
              heading={current ? conversationHeading(current) : undefined}
              onDelete={current ? () => { setDeleteError(""); setToDelete(current); } : undefined} />
          ) : (
            <section className="cv-cs-card cv-cs-empty-chat">
              <MessageSquare size={30} aria-hidden="true" />
              <strong>Choisissez une conversation</strong>
              <span>ou ouvrez une nouvelle demande pour écrire à la banque.</span>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!toDelete} title="Supprimer cette conversation ?" confirmLabel="Supprimer" busy={deleting}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete}>
        <p>La conversation « {toDelete ? conversationHeading(toDelete).subtitle : ""} » disparaîtra de votre espace.
          {toDelete && LIVE.includes(toDelete.status) ? " Elle sera terminée et votre conseiller en sera informé." : ""}</p>
        <p className="cv-muted">Pour des raisons réglementaires, la banque en conserve une trace.</p>
        {deleteError && <p className="cv-error" role="alert">{deleteError}</p>}
      </ConfirmDialog>
    </div>
  );
}
