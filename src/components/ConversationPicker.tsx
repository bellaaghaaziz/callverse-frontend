"use client";
import { useEffect, useId, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import { skillLabel, intentLabel, conversationSubject } from "@/lib/presentation";
import StatusBadge from "./StatusBadge";

export interface ConversationChoice {
  id: string; customerName: string; advisorName: string | null; skill: string;
  intent: string | null; status: "QUEUED" | "ASSIGNED" | "ACTIVE" | "ESCALATED" | "RESOLVED" | "ABANDONED";
  queuedAt: string; preview: string;
  // Who is on the other side for the signed-in role, and what the request is about (backend V9).
  counterpartName?: string | null; subject?: string | null; removedByCustomer?: boolean;
}
interface DirectoryPage { content: ConversationChoice[]; page: number; size: number; hasNext: boolean }
const dates = new Intl.DateTimeFormat("fr-FR", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

export default function ConversationPicker({ onSelect, selectedId, resolvedOnly = false, compact = false, customerView = false, title = "Choisir une conversation" }: {
  onSelect: (choice: ConversationChoice) => void; selectedId?: string | null; resolvedOnly?: boolean; compact?: boolean; customerView?: boolean; title?: string;
}) {
  const label = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(resolvedOnly ? "RESOLVED" : "");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DirectoryPage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    const refresh = () => setRevision(n => n + 1);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const conversationUpdated = () => { clearTimeout(timer); timer = setTimeout(refresh, 250); };
    window.addEventListener("focus", refresh);
    window.addEventListener("callverse:reconnected", refresh);
    if (compact) window.addEventListener("callverse:conversation-updated", conversationUpdated);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); window.removeEventListener("callverse:reconnected", refresh); window.removeEventListener("callverse:conversation-updated", conversationUpdated); };
  }, [compact]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(""); setData(null);
    const params = new URLSearchParams({q:search,page:String(page)});
    if (resolvedOnly || status) params.set("status", resolvedOnly ? "RESOLVED" : status);
    apiFetch<DirectoryPage>("/conversations/accessible?" + params, {signal:controller.signal})
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [search,status,page,revision,resolvedOnly]);
  const filters = <form className="cv-directory-toolbar cv-section" onSubmit={e=>{e.preventDefault();setPage(0);setSearch(query.trim());setRevision(n=>n+1);}}>
      <label className="cv-label" htmlFor={label}>{customerView ? "Rechercher un message" : "Rechercher une conversation"}<input id={label} className="cv-input" maxLength={120} placeholder={customerView ? "Un mot de votre échange…" : "Client, conseiller ou dernier message…"} value={query} onChange={e=>setQuery(e.target.value)} /></label>
      {!resolvedOnly && <label className="cv-label">Statut des conversations<select className="cv-input" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}>
        <option value="">Tous les statuts</option><option value="QUEUED">En attente</option><option value="ASSIGNED">À prendre en charge</option><option value="ACTIVE">En cours</option><option value="ESCALATED">Escaladées</option><option value="RESOLVED">Résolues</option><option value="ABANDONED">Terminées sans résolution</option>
      </select></label>}
      <button className="cv-button cv-button-secondary">Rechercher</button>
    </form>;
  return <section className={"cv-conversation-picker" + (compact ? " cv-picker-compact" : "")} aria-busy={busy}>
    <div className="cv-ai-card-heading"><h2 className="cv-tool-title">{title}</h2>
      {!customerView && <button type="button" className="cv-button cv-button-secondary cv-button-small" disabled={busy} onClick={() => setRevision(n=>n+1)}>Actualiser la liste</button>}</div>
    {customerView ? <details className="cv-customer-filters"><summary>Rechercher ou filtrer{search || status ? " · filtre actif" : ""}</summary>{filters}</details> : filters}
    {error && <p role="alert" className="cv-error cv-section">{error}</p>}
    {busy && <p role="status" className="cv-muted cv-section">Chargement des conversations…</p>}
    {!busy && data?.content.length === 0 && <p className="cv-notice cv-section">{search || status ? "Aucune conversation ne correspond aux filtres." : "Aucune conversation accessible pour le moment. Les échanges enregistrés par votre conseiller apparaîtront ici."}</p>}
    <div className="cv-directory-list cv-section">
      {data?.content.map(item=><button type="button" key={item.id} className={"cv-directory-item" + (selectedId===item.id ? " cv-directory-selected" : "")}
        aria-pressed={selectedId===item.id} onClick={()=>onSelect(item)}>
        <span className="cv-directory-heading"><strong>{customerView ? item.subject || conversationSubject(item) : item.counterpartName ?? item.customerName}</strong><StatusBadge status={item.status} /></span>
        <span className="cv-muted">{item.subject || intentLabel[item.intent || ""] || skillLabel[item.skill] || item.skill} · {dates.format(new Date(item.queuedAt))}</span>
        {item.removedByCustomer && <span className="cv-badge cv-badge-rose cv-removed-badge">Supprimée par le client</span>}
        {!customerView && <span className="cv-muted">{item.advisorName ? "Conseiller : " + item.advisorName : "En attente d’un conseiller"}</span>}
        <span className="cv-directory-preview">{item.preview || "Aucun message pour le moment."}</span>
        <span className="cv-directory-open">{selectedId===item.id ? "Conversation sélectionnée" : "Ouvrir la conversation"} →</span>
      </button>)}
    </div>
    {data && (!customerView || page > 0 || data.hasNext) && <nav className="cv-directory-pages cv-section" aria-label="Pages des conversations"><button type="button" className="cv-button cv-button-secondary cv-button-small" disabled={busy || page===0} onClick={()=>setPage(n=>n-1)}>Précédent</button><span className="cv-muted">Page {page+1}</span><button type="button" className="cv-button cv-button-secondary cv-button-small" disabled={busy || !data.hasNext} onClick={()=>setPage(n=>n+1)}>Suivant</button></nav>}
  </section>;
}
