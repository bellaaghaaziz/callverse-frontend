"use client";
import { useEffect, useId, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";

export interface CustomerChoice { id: string; firstName: string; lastName: string; region: string | null }
interface DirectoryPage { content: CustomerChoice[]; page: number; size: number; hasNext: boolean }

export default function CustomerPicker({ selectedId, onSelect, disabled = false }: {
  selectedId?: string; onSelect: (customer: CustomerChoice) => void; disabled?: boolean;
}) {
  const label = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DirectoryPage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(""); setData(null);
    const params = new URLSearchParams({ q: search, page: String(page) });
    apiFetch<DirectoryPage>("/customers/directory?" + params, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [search, page, revision]);
  return <section className="cv-conversation-picker" aria-label="Choisir un client" aria-busy={busy}>
    <form className="cv-directory-toolbar cv-section" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(query.trim()); setRevision(n => n + 1); }}>
      <label className="cv-label" htmlFor={label}>Rechercher un client
        <input id={label} className="cv-input" maxLength={120} placeholder="Nom, prénom ou région…" value={query} disabled={disabled} onChange={e => setQuery(e.target.value)} />
      </label>
      <button className="cv-button cv-button-secondary" disabled={disabled}>Rechercher</button>
    </form>
    {busy && <p role="status" className="cv-muted cv-section">Chargement des clients…</p>}
    {error && <div className="cv-section"><p role="alert" className="cv-error">{error}</p><button type="button" className="cv-button cv-button-secondary" onClick={() => setRevision(n => n + 1)} disabled={disabled}>Réessayer</button></div>}
    {!busy && data?.content.length === 0 && <p className="cv-notice cv-section">{search ? "Aucun client ne correspond à votre recherche." : "Aucun client disponible pour le moment."}</p>}
    <div className="cv-directory-list cv-section">
      {data?.content.map(customer => <button key={customer.id} type="button" disabled={disabled} aria-pressed={selectedId === customer.id}
        className={"cv-directory-item" + (selectedId === customer.id ? " cv-directory-selected" : "")} onClick={() => onSelect(customer)}>
        <span className="cv-directory-heading"><strong>{customer.firstName} {customer.lastName}</strong></span>
        {customer.region && <span className="cv-muted">{customer.region}</span>}
        <span className="cv-directory-open">{selectedId === customer.id ? "Client sélectionné" : "Choisir ce client"} →</span>
      </button>)}
    </div>
    {data && <nav className="cv-directory-pages cv-section" aria-label="Pages des clients">
      <button type="button" className="cv-button cv-button-secondary cv-button-small" disabled={disabled || busy || page === 0} onClick={() => setPage(n => n - 1)}>Précédent</button>
      <span className="cv-muted">Page {page + 1}</span>
      <button type="button" className="cv-button cv-button-secondary cv-button-small" disabled={disabled || busy || !data.hasNext} onClick={() => setPage(n => n + 1)}>Suivant</button>
    </nav>}
  </section>;
}
