"use client";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import { referenceAdmin, type ProductCategory, type ProductRecord } from "@/lib/reference-admin";
import { DeleteReference, ReferenceFeedback } from "./ReferenceControls";

const categories: Record<ProductCategory, string> = { CURRENT_ACCOUNT: "Compte courant", SAVINGS: "Épargne", CONSUMER_LOAN: "Crédit à la consommation", MORTGAGE: "Crédit immobilier" };
const empty = { code: "", name: "", category: "CURRENT_ACCOUNT" as ProductCategory, monthlyFee: "0", interestPercent: "", active: true };

export default function AdminProducts() {
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [selected, setSelected] = useState<ProductRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    referenceAdmin.products(search, controller.signal).then(setItems).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, revision]);
  function choose(item: ProductRecord | null) {
    setSelected(item); setNotice(""); setError("");
    setForm(item ? { code: item.code, name: item.name, category: item.category, monthlyFee: String(item.monthlyFee), interestPercent: item.interestRate == null ? "" : String(Number((item.interestRate * 100).toFixed(2))), active: item.active } : empty);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(""); setNotice("");
    try {
      const result = await referenceAdmin.saveProduct(selected?.id || null, { code: form.code.trim(), name: form.name.trim(), category: form.category,
        monthlyFee: Number(form.monthlyFee), interestRate: form.interestPercent === "" ? null : Number((Number(form.interestPercent) / 100).toFixed(4)), active: form.active });
      choose(result); setNotice("Produit enregistré."); setRevision(n => n + 1);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="cv-stack"><section className="cv-card cv-card-pad"><h2>Catalogue produits</h2>
    <p className="cv-subtitle">Gérez les offres bancaires. Désactiver un produit conserve les comptes qui l’utilisent.</p>
    <form className="cv-toolbar cv-section" onSubmit={e => { e.preventDefault(); setSearch(query.trim()); setRevision(n => n + 1); }}>
      <input aria-label="Rechercher un produit" className="cv-input grow" maxLength={120} value={query} onChange={e => setQuery(e.target.value)} placeholder="Code ou nom" />
      <button className="cv-button" disabled={busy}>Rechercher</button><button type="button" className="cv-button cv-button-secondary" disabled={busy} onClick={() => choose(null)}>Nouveau produit</button>
    </form><ReferenceFeedback error={error} notice={notice} loading={loading} />
    <div className="cv-table-wrap cv-section"><table className="cv-table"><caption className="sr-only">Produits bancaires</caption>
      <thead><tr><th>Produit</th><th>Catégorie</th><th>Frais / mois</th><th>État</th><th>Actions</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id}><td><strong>{item.name}</strong><p>{item.code} · {item.accountCount} compte(s)</p></td><td>{categories[item.category]}</td><td>{item.monthlyFee.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td><td>{item.active ? "Actif" : "Retiré"}</td><td><button className="cv-button cv-button-secondary cv-button-small" disabled={busy} onClick={() => choose(item)}>Modifier {item.code}</button></td></tr>)}</tbody>
    </table></div>{!loading && !items.length && <p className="cv-muted cv-section">Aucun produit trouvé.</p>}
    {items.length >= 200 && <p className="cv-notice">Les 200 premiers résultats sont affichés. Précisez votre recherche.</p>}</section>
    <section className="cv-card cv-card-pad"><h2>{selected ? "Modifier le produit" : "Créer un produit"}</h2>
      <form className="cv-stack cv-section" onSubmit={save}><fieldset disabled={busy} className="cv-stack">
        <div className="cv-form-row"><label className="cv-field"><span className="cv-label">Code permanent</span><input className="cv-input" required minLength={2} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,39}" readOnly={!!selected} value={form.code} onChange={e => setForm(s => ({ ...s, code: e.target.value.toUpperCase() }))} /></label>
          <label className="cv-field"><span className="cv-label">Nom</span><input className="cv-input" required maxLength={120} value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} /></label></div>
        <div className="cv-form-row"><label className="cv-field"><span className="cv-label">Catégorie</span><select className="cv-input" value={form.category} onChange={e => setForm(s => ({ ...s, category: e.target.value as ProductCategory }))}>{Object.entries(categories).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="cv-field"><span className="cv-label">Frais mensuels (€)</span><input className="cv-input" type="number" min={0} max={999999.99} step="0.01" required value={form.monthlyFee} onChange={e => setForm(s => ({ ...s, monthlyFee: e.target.value }))} /></label>
          <label className="cv-field"><span className="cv-label">Taux annuel (%) — facultatif</span><input className="cv-input" type="number" min={0} max={100} step="0.01" value={form.interestPercent} onChange={e => setForm(s => ({ ...s, interestPercent: e.target.value }))} /></label></div>
        <label><input type="checkbox" checked={form.active} onChange={e => setForm(s => ({ ...s, active: e.target.checked }))} /> Produit actif</label>
        <div className="cv-toolbar"><button className="cv-button">{busy ? "Enregistrement…" : "Enregistrer le produit"}</button>{selected && <button type="button" className="cv-button cv-button-secondary" onClick={() => choose(null)}>Annuler la modification</button>}</div>
      </fieldset></form>
      {selected && (selected.accountCount > 0 ? <p className="cv-muted cv-section">La suppression est impossible : des comptes utilisent ce produit. Vous pouvez le désactiver.</p> : <div className="cv-section"><DeleteReference key={selected.id} name={selected.name} busy={busy} onDelete={async () => {
        setBusy(true); setError(""); try { await referenceAdmin.deleteProduct(selected.id); choose(null); setNotice("Produit supprimé."); setRevision(n => n + 1); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
      }} /></div>)}
    </section></div>;
}
