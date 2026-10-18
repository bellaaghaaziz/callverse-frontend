"use client";

import { useEffect, useId, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";

type Role = "CUSTOMER" | "ADVISOR" | "SUPERVISOR" | "ADMIN";
type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type Comment = { id: string; authorName: string; authorRole: Role; content: string; createdAt: string };
type Ticket = { id: string; customerId: string; customerName: string; title: string; description: string | null;
  category: string; severity: number; status: Status; createdAt: string; resolvedAt: string | null; comments: Comment[] };
type TicketPage = { content: Ticket[]; page: number; size: number; hasNext: boolean };
type Credit = { id: string; amount: number; reason: string; createdAt: string; approvedBy: string | null };
type Choice = { id: string; customerName: string; queuedAt: string };
type Conversation = { id: string; customerId: string; status: string };
type Account = { id: string; maskedIban: string; currency: string; status: string; product: { category: string } | null };
const statuses: Record<Status, string> = { OPEN: "Ouvert", IN_PROGRESS: "En traitement", RESOLVED: "Résolu — à confirmer", CLOSED: "Clôturé" };
const dates = (value: string) => new Date(value).toLocaleString("fr-FR");
const euros = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

export default function SupportDesk({ role, customerId, conversationId }: { role: Role; customerId?: string | null; conversationId?: string | null }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<TicketPage | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const label = useId();
  useEffect(() => { setSelected(null); setSelectedTicketId(null); setPage(0); setComment(""); }, [customerId]);
  useEffect(() => {
    if (!selectedTicketId) return;
    const controller = new AbortController();
    apiFetch<Ticket>(`/tickets/${selectedTicketId}`, { signal: controller.signal })
      .then(ticket => { if (!controller.signal.aborted) setSelected(ticket); })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [selectedTicketId, revision, customerId]);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page) });
    if (customerId) query.set("customerId", customerId);
    if (status) query.set("status", status);
    setLoading(true); setError(""); setData(null); setCredits([]);
    Promise.all([
      apiFetch<TicketPage>("/tickets?" + query, { signal: controller.signal }),
      apiFetch<Credit[]>("/credits" + (customerId ? "?customerId=" + customerId : ""), { signal: controller.signal }),
    ]).then(([tickets, creditRows]) => { if (!controller.signal.aborted) { setData(tickets); setCredits(creditRows); } })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customerId, page, status, revision]);
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function changeStatus(target: Status) {
    if (!selected) return;
    const updated = await apiFetch<Ticket>(`/tickets/${selected.id}/status`, { method: "PUT", body: JSON.stringify({ expectedStatus: selected.status, status: target }) });
    setSelected(previous => previous?.id === updated.id ? updated : previous);
    setRevision(n => n + 1);
  }
  return <section className="cv-card cv-card-pad cv-section" id="support-followup" aria-busy={busy || loading}>
    <div className="cv-ai-card-heading"><div><p className="cv-eyebrow">SUIVI DES DEMANDES</p><h2 className="cv-tool-title">Tickets et gestes commerciaux</h2>
      <p className="cv-subtitle">Suivez les actions qui continuent après la conversation.</p></div>
      <button className="cv-button cv-button-secondary" disabled={busy || loading} onClick={() => setRevision(n => n + 1)}>Actualiser le suivi</button></div>
    {error && <p role="alert" className="cv-error cv-section">{error}</p>}
    <label className="cv-label cv-section" htmlFor={label + "-status"}>Statut des tickets<select id={label + "-status"} className="cv-input" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
      <option value="">Tous les tickets</option>{Object.entries(statuses).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
    {loading && <p role="status" className="cv-muted">Chargement du suivi…</p>}
    {!loading && data?.content.length === 0 && <p className="cv-notice cv-section">Aucun ticket ne correspond à cette sélection.</p>}
    <div className="cv-directory-list cv-section">{data?.content.map(ticket => <button type="button" className="cv-directory-item" key={ticket.id} disabled={busy}
      onClick={() => { setSelected(ticket); setSelectedTicketId(ticket.id); setComment(""); }}>
      <strong>{ticket.title}</strong><span>{ticket.customerName} · {statuses[ticket.status]} · Gravité {ticket.severity}/5</span><small>{dates(ticket.createdAt)}</small></button>)}</div>
    {data && <nav className="cv-directory-pages cv-section" aria-label="Pages des tickets"><button type="button" className="cv-button cv-button-secondary" disabled={!page || busy || loading} onClick={() => setPage(n => n - 1)}>Tickets précédents</button>
      <span>Page {page + 1}</span><button type="button" className="cv-button cv-button-secondary" disabled={!data.hasNext || busy || loading} onClick={() => setPage(n => n + 1)}>Tickets suivants</button></nav>}
    {selected && <section className="cv-notice cv-section" aria-label="Détail du ticket"><h3>{selected.title}</h3><p>{selected.description || "Aucune description."}</p><p>{statuses[selected.status]}</p>
      <div className="flex gap-2 flex-wrap">
        {role !== "CUSTOMER" && selected.status === "OPEN" && <button className="cv-button" disabled={busy} onClick={() => void perform(() => changeStatus("IN_PROGRESS"))}>Prendre en traitement</button>}
        {role !== "CUSTOMER" && ["OPEN", "IN_PROGRESS"].includes(selected.status) && <button className="cv-button" disabled={busy} onClick={() => void perform(() => changeStatus("RESOLVED"))}>Marquer le ticket résolu</button>}
        {role !== "CUSTOMER" && selected.status === "RESOLVED" && <button className="cv-button cv-button-secondary" disabled={busy} onClick={() => void perform(() => changeStatus("IN_PROGRESS"))}>Rouvrir le ticket</button>}
        {role === "CUSTOMER" && selected.status === "RESOLVED" && <button className="cv-button" disabled={busy} onClick={() => void perform(() => changeStatus("CLOSED"))}>Confirmer la résolution et clôturer</button>}
      </div>
      <h4 className="cv-section">Échanges de suivi</h4>{selected.comments.length === 0 && <p>Aucun commentaire.</p>}
      {selected.comments.map(item => <article className="cv-section" key={item.id}><strong>{item.authorName}</strong><small> · {dates(item.createdAt)}</small><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.content}</p></article>)}
      {selected.status !== "CLOSED" && <form className="cv-section" onSubmit={e => { e.preventDefault(); void perform(async () => {
        const id = selected.id;
        await apiFetch(`/tickets/${id}/comments`, { method: "POST", body: JSON.stringify({ content: comment.trim() }) });
        const updated = await apiFetch<Ticket>(`/tickets/${id}`); setSelected(previous => previous?.id === id ? updated : previous); setComment("");
      }); }}><label className="cv-label" htmlFor={label + "-comment"}>Commentaire de suivi — visible par le client<textarea id={label + "-comment"} className="cv-input" required maxLength={4000} value={comment} disabled={busy} onChange={e => setComment(e.target.value)} /></label>
        <button className="cv-button" disabled={busy || !comment.trim()}>Ajouter le commentaire</button></form>}
    </section>}
    <details className="cv-section"><summary>Historique des gestes commerciaux ({credits.length}{credits.length === 100 ? "+" : ""})</summary>
      {credits.length === 0 ? <p className="cv-muted">Aucun geste commercial enregistré.</p> : <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Date</th><th>Montant</th><th>Motif</th><th>Validation</th></tr></thead>
        <tbody>{credits.map(credit => <tr key={credit.id}><td>{dates(credit.createdAt)}</td><td>{euros(credit.amount)}</td><td>{credit.reason}</td><td>{credit.approvedBy ? "Supervision" : "Plafond conseiller"}</td></tr>)}</tbody></table></div>}
    </details>
    {role !== "CUSTOMER" && <CreditComposer role={role} conversationId={conversationId} onGranted={() => setRevision(n => n + 1)} />}
  </section>;
}

function CreditComposer({ role, conversationId, onGranted }: { role: Role; conversationId?: string | null; onGranted: () => void }) {
  const [choices, setChoices] = useState<Choice[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const label = useId();
  const selectedId = conversationId || chosen;
  const selectedIdRef = useRef(selectedId);
  const inFlight = useRef(false);
  selectedIdRef.current = selectedId;
  const canGrant = conversation?.status === "ACTIVE" || (role !== "ADVISOR" && conversation?.status === "ESCALATED");
  useEffect(() => {
    if (conversationId) return;
    const controller = new AbortController();
    const statuses = role === "ADVISOR" ? ["ACTIVE"] : ["ACTIVE", "ESCALATED"];
    Promise.all(statuses.map(status => apiFetch<{ content: Choice[] }>("/conversations/accessible?" + new URLSearchParams({ status, q: search }), { signal: controller.signal })))
      .then(pages => { if (!controller.signal.aborted) setChoices(pages.flatMap(page => page.content)); })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [conversationId, role, search]);
  useEffect(() => {
    const controller = new AbortController(); setConversation(null); setAccounts([]); setAccountId(""); setAmount(""); setReason(""); setRequestId(null); setNotice(""); setError("");
    if (selectedId) apiFetch<Conversation>(`/conversations/${selectedId}`, { signal: controller.signal }).then(async record => {
      const profile = await apiFetch<{ accounts: Account[] }>(`/customers/${record.customerId}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setConversation(record);
      const eligible = profile.accounts.filter(account => account.status === "ACTIVE" && account.currency === "EUR" && account.product?.category === "CURRENT_ACCOUNT");
      setAccounts(eligible); if (eligible.length === 1) setAccountId(eligible[0].id);
    }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [selectedId]);
  async function grant() {
    if (!conversation || !canGrant || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(""); setNotice("");
    const identity = requestId || crypto.randomUUID(); setRequestId(identity);
    try {
      const result = await apiFetch<Credit>("/credits", { method: "POST", body: JSON.stringify({ customerId: conversation.customerId, conversationId: conversation.id,
        accountId, amount: Number(amount), reason: reason.trim(), requestId: identity }) });
      if (selectedIdRef.current === conversation.id) { setNotice(`${euros(result.amount)} ont été crédités sur le compte sélectionné.`); setAmount(""); setReason(""); setRequestId(null); }
      onGranted();
    } catch (e) { if (selectedIdRef.current === conversation.id) setError(errorMessage(e)); } finally { inFlight.current = false; setBusy(false); }
  }
  return <details className="cv-section"><summary>Accorder un geste commercial</summary>
    <p className="cv-subtitle">Le montant est réellement ajouté au compte dans CallVerse. Le plafond conseiller porte sur les crédits du client pendant les dernières 24 heures.
      {role !== "ADVISOR" && " Votre validation de supervision autorise un dépassement et reste enregistrée."}</p>
    {!conversationId && <><form className="cv-form-row cv-section" onSubmit={e => { e.preventDefault(); setSearch(query.trim()); }}><label className="cv-label" htmlFor={label + "-search"}>Rechercher la conversation<input id={label + "-search"} className="cv-input" maxLength={120} value={query} onChange={e => setQuery(e.target.value)} /></label><button className="cv-button cv-button-secondary" disabled={busy}>Rechercher les échanges</button></form>
      <label className="cv-label" htmlFor={label + "-conversation"}>Conversation du geste commercial<select className="cv-input" id={label + "-conversation"} value={chosen} disabled={busy} onChange={e => setChosen(e.target.value)}><option value="">Choisir un échange actif</option>
        {choices.map(choice => <option key={choice.id} value={choice.id}>{choice.customerName} · {dates(choice.queuedAt)}</option>)}</select></label></>}
    {error && <p role="alert" className="cv-error cv-section">{error}</p>}{notice && <p role="status" className="cv-notice cv-section">{notice}</p>}
    {conversation && accounts.length === 0 && <p className="cv-notice cv-section">Ce client ne dispose d’aucun compte courant EUR actif éligible.</p>}
    {conversation && !canGrant && <p className="cv-notice cv-section">Le geste commercial nécessite une conversation en cours{role !== "ADVISOR" ? " ou escaladée" : ""}.</p>}
    <form className="cv-section" onSubmit={e => { e.preventDefault(); void grant(); }}>
      <label className="cv-label" htmlFor={label + "-account"}>Compte à créditer<select id={label + "-account"} className="cv-input" required value={accountId} disabled={busy} onChange={e => { setAccountId(e.target.value); setRequestId(null); }}><option value="">Choisir un compte</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.maskedIban}</option>)}</select></label>
      <label className="cv-label cv-section" htmlFor={label + "-amount"}>Montant du geste commercial en euros<input id={label + "-amount"} className="cv-input" required type="number" min="0.01" max="999999.99" step="0.01" value={amount} disabled={busy} onChange={e => { setAmount(e.target.value); setRequestId(null); }} /></label>
      <label className="cv-label cv-section" htmlFor={label + "-reason"}>Motif du geste commercial<textarea id={label + "-reason"} className="cv-input" required maxLength={255} value={reason} disabled={busy} onChange={e => { setReason(e.target.value); setRequestId(null); }} /></label>
      <button className="cv-button" disabled={busy || !canGrant || !accountId || !reason.trim() || !amount}>{busy ? "Enregistrement…" : role === "ADVISOR" ? "Accorder dans mon plafond" : "Valider et accorder le crédit"}</button>
    </form>
  </details>;
}
