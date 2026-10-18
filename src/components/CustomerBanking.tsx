"use client";
import { useEffect, useId, useState } from "react";
import { apiFetch, apiResponse, errorMessage } from "@/lib/api";
import { money, type Conversation, type Customer, type Schema } from "@/lib/contracts";
import { intentLabel, skillLabel, statusLabel } from "@/lib/presentation";

export default function CustomerBanking({ onOpened }: { onOpened: (conversation: Conversation) => void }) {
  const [profile, setProfile] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Schema["Transaction"][]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    Promise.all([apiFetch<Customer>("/me/customer", { signal: controller.signal }), apiFetch<Schema["TransactionsResponse"]>("/me/transactions?count=20", { signal: controller.signal })])
      .then(([customer, movements]) => { if (!controller.signal.aborted) { setProfile(customer); setTransactions(movements.transactions); } })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  return <div className="cv-stack cv-section" id="banking"><section className="cv-card cv-card-pad" aria-busy={loading}>
    <div className="cv-ai-card-heading"><div><h2 className="cv-tool-title">Mes comptes et mouvements</h2>{profile && <p className="cv-subtitle">{profile.firstName} {profile.lastName} · {profile.region}</p>}</div><button className="cv-button cv-button-secondary" disabled={loading} onClick={() => setRevision(n => n + 1)}>Actualiser mes comptes</button></div>
    {error && <p role="alert" className="cv-error cv-section">{error}</p>}{loading && <p role="status" className="cv-muted cv-section">Chargement de vos comptes…</p>}
    {profile && <><div className="cv-section cv-stack">{profile.accounts.map(account => <article className="cv-result" key={account.id}><h3>{account.product?.name || "Compte bancaire"}</h3><p>{account.maskedIban} · {statusLabel[account.status] || account.status}</p><strong>{money(account.balance, account.currency)}</strong>
      {account.cards.map(card => <p key={card.id}>Carte {card.network} ···· {card.panLast4} · {statusLabel[card.status] || card.status}</p>)}</article>)}{!profile.accounts.length && <p className="cv-notice">Aucun compte bancaire n’est encore rattaché à votre profil. Contactez votre conseiller pour connaître vos offres.</p>}</div>
      <h3 className="cv-section">Vos 20 derniers mouvements</h3>{transactions.length ? <div className="cv-table-wrap cv-section"><table className="cv-table"><caption className="sr-only">Mouvements de mes comptes</caption><thead><tr><th>Date</th><th>Compte</th><th>Libellé</th><th>Montant</th><th>Statut</th></tr></thead><tbody>{transactions.map(transaction => <tr key={transaction.id}><td>{new Date(transaction.bookedAt).toLocaleDateString("fr-FR")}</td><td>{profile.accounts.find(account => account.id === transaction.accountId)?.maskedIban || "Compte"}</td><td>{transaction.label}</td><td>{money(transaction.amount, transaction.currency)}</td><td>{{ BOOKED: "Comptabilisé", PENDING: "En attente", REJECTED: "Rejeté", DISPUTED: "Contesté" }[transaction.status] || transaction.status}</td></tr>)}</tbody></table></div> : <p className="cv-muted cv-section">Aucun mouvement enregistré.</p>}
      <StatementDownload />
    </>}
  </section><CustomerContact onOpened={onOpened} /></div>;
}

function CustomerContact({ onOpened }: { onOpened: (conversation: Conversation) => void }) {
  const [skill, setSkill] = useState("ACCOUNTS"), [intent, setIntent] = useState("OTHER");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  return <section className="cv-card cv-card-pad" id="contact"><h2 className="cv-tool-title">Contacter un conseiller</h2><p className="cv-subtitle">Choisissez le sujet de votre demande. Votre échange sera placé dans la file du service concerné.</p>
    <form className="cv-stack cv-section" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError(""); setNotice("");
      try { const conversation = await apiFetch<Conversation>("/me/conversations", { method: "POST", body: JSON.stringify({ skill, intent: intent || null }) }); onOpened(conversation); setNotice("Votre demande a été enregistrée. Vous pouvez écrire dans la conversation ouverte ci-dessus."); }
      catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
    }}><fieldset disabled={busy} className="cv-stack"><div className="cv-form-row"><label className="cv-label">Service<select className="cv-input" value={skill} onChange={e => setSkill(e.target.value)}>{Object.entries(skillLabel).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label className="cv-label">Motif de ma demande<select className="cv-input" value={intent} onChange={e => setIntent(e.target.value)}>{Object.entries(intentLabel).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label></div><button className="cv-button">{busy ? "Enregistrement…" : "Ouvrir ma conversation"}</button></fieldset></form>
    {error && <p className="cv-error cv-section" role="alert">{error}</p>}{notice && <p className="cv-notice cv-section" role="status">{notice}</p>}
  </section>;
}

function StatementDownload() {
  const id = useId();
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const valid = !!from && !!to && to >= from && Date.parse(to) - Date.parse(from) <= 366 * 86400000;
  return <details className="cv-section"><summary>Télécharger mon relevé de mouvements</summary><form className="cv-stack cv-section" onSubmit={async e => {
    e.preventDefault(); if (busy || !valid) return; setBusy(true); setError("");
    try { const response = await apiResponse("/me/statement?" + new URLSearchParams({ from, to })); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `callverse-movements-${from}-${to}.csv`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }}><div className="cv-form-row"><label className="cv-label" htmlFor={id + "-from"}>Du<input id={id + "-from"} className="cv-input" type="date" required value={from} disabled={busy} onChange={e => setFrom(e.target.value)} /></label><label className="cv-label" htmlFor={id + "-to"}>Au<input id={id + "-to"} className="cv-input" type="date" min={from} required value={to} disabled={busy} onChange={e => setTo(e.target.value)} /></label></div>
    {!valid && <p className="cv-error">Choisissez une période dans l’ordre chronologique, de 366 jours au maximum.</p>}{error && <p role="alert" className="cv-error">{error}</p>}<button className="cv-button cv-button-secondary" disabled={busy || !valid}>{busy ? "Téléchargement…" : "Télécharger le relevé CSV"}</button>
  </form></details>;
}
