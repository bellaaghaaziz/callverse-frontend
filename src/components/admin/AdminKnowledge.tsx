"use client";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import { referenceAdmin, type ArticleRecord } from "@/lib/reference-admin";
import { DeleteReference, ReferenceFeedback } from "./ReferenceControls";

const empty = { category: "CARDS", title: "", content: "", tags: "", published: false };
export default function AdminKnowledge() {
  const [items, setItems] = useState<ArticleRecord[]>([]), [selected, setSelected] = useState<ArticleRecord | null>(null);
  const [form, setForm] = useState(empty), [query, setQuery] = useState(""), [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    referenceAdmin.articles(search, controller.signal).then(setItems).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, revision]);
  function choose(item: ArticleRecord | null) {
    setSelected(item); setNotice(""); setError("");
    setForm(item ? { category: item.category, title: item.title, content: item.content, tags: item.tags.join(", "), published: item.published } : empty);
  }
  return <div className="cv-stack"><section className="cv-card cv-card-pad" data-tour="knowledge"><h2>Procédures et articles</h2>
    <p className="cv-subtitle">Préparez un brouillon, publiez une procédure ou retirez-la. Seuls les articles publiés sont accessibles aux conseillers et à l’IA.</p>
    <form className="cv-toolbar cv-section" onSubmit={e => { e.preventDefault(); setSearch(query.trim()); setRevision(n => n + 1); }}>
      <input className="cv-input grow" aria-label="Rechercher les articles" maxLength={120} value={query} onChange={e => setQuery(e.target.value)} placeholder="Titre ou contenu" />
      <button className="cv-button" disabled={busy}>Rechercher</button><button type="button" className="cv-button cv-button-secondary" disabled={busy} onClick={() => choose(null)}>Nouvel article</button></form>
    <ReferenceFeedback error={error} notice={notice} loading={loading} />
    <div className="cv-section cv-stack">{items.map(item => <article className="cv-result" key={item.id}>
      <div className="cv-toolbar"><div className="grow"><h3>{item.title}</h3><p className="cv-muted">{item.category} · Version {item.version} · {item.published ? "Publié" : "Brouillon"} · {new Date(item.updatedAt).toLocaleString("fr-FR")}</p></div><button className="cv-button cv-button-secondary cv-button-small" disabled={busy} onClick={() => choose(item)}>Modifier {item.title}</button></div>
      <p className="cv-subtitle">{item.content.slice(0, 180)}{item.content.length > 180 ? "…" : ""}</p>
      {item.published && !item.semanticIndexed && <p className="cv-muted">Recherche textuelle disponible. Index sémantique à reconstruire.</p>}
    </article>)}</div>{!loading && !items.length && <p className="cv-muted">Aucun article trouvé.</p>}
    {items.length >= 100 && <p className="cv-notice">Les 100 premiers articles sont affichés. Précisez votre recherche.</p>}</section>
    <section className="cv-card cv-card-pad"><h2>{selected ? "Modifier l’article" : "Créer un article"}</h2>
      {selected && <p className="cv-muted">Vous modifiez la version {selected.version}. Une modification simultanée sera refusée pour protéger le travail déjà enregistré.</p>}
      <form className="cv-stack cv-section" onSubmit={async e => {
        e.preventDefault(); if (busy) return; setBusy(true); setError(""); setNotice("");
        try { const result = await referenceAdmin.saveArticle(selected?.id || null, { category: form.category, title: form.title, content: form.content,
          tags: form.tags.split(",").map(tag => tag.trim()).filter(Boolean), published: form.published, ...(selected ? { expectedVersion: selected.version } : {}) });
          choose(result); setNotice(result.published ? "Article enregistré et publié." : "Brouillon enregistré."); setRevision(n => n + 1);
        } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
      }}><fieldset disabled={busy} className="cv-stack">
        <div className="cv-form-row"><label className="cv-field"><span className="cv-label">Catégorie</span><input className="cv-input" required maxLength={40} value={form.category} onChange={e => setForm(s => ({ ...s, category: e.target.value }))} /></label>
          <label className="cv-field"><span className="cv-label">Titre</span><input className="cv-input" required maxLength={200} value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} /></label></div>
        <label className="cv-field"><span className="cv-label">Contenu de la procédure</span><textarea className="cv-input" required rows={12} maxLength={50000} value={form.content} onChange={e => setForm(s => ({ ...s, content: e.target.value }))} /></label>
        <label className="cv-field"><span className="cv-label">Mots-clés séparés par des virgules (20 maximum)</span><input className="cv-input" maxLength={1200} value={form.tags} onChange={e => setForm(s => ({ ...s, tags: e.target.value }))} /></label>
        <label><input type="checkbox" checked={form.published} onChange={e => setForm(s => ({ ...s, published: e.target.checked }))} /> Publier cet article</label>
        <div className="cv-toolbar"><button className="cv-button">{busy ? "Enregistrement…" : "Enregistrer l’article"}</button>{selected && <button type="button" className="cv-button cv-button-secondary" onClick={() => choose(null)}>Annuler la modification</button>}</div>
      </fieldset></form>
      {selected && <div className="cv-section"><DeleteReference key={selected.id + ":" + selected.version} name={selected.title} busy={busy} onDelete={async () => {
        setBusy(true); setError(""); try { await referenceAdmin.deleteArticle(selected.id, selected.version); choose(null); setNotice("Article supprimé."); setRevision(n => n + 1); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
      }} /></div>}
    </section></div>;
}
