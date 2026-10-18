"use client";

import { useEffect, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import { skillNames, type WorkforceRecommendation } from "@/lib/ai-workspace";

type Candidate = { id: string; displayName: string; skills: Record<string, number> };
type Selection = { count: number; applied: boolean; appliedAdvisorIds: string[]; candidates: Candidate[] };
type Applied = { alreadyApplied: boolean; appliedAt: string; advisorIds: string[] };

export default function WorkforceApplication({ proposal, onApplied }: { proposal: WorkforceRecommendation; onApplied: () => void }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [level, setLevel] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [revision, setRevision] = useState(0);
  const base = `/supervision/workforce/recommendations/${proposal.decisionId}`;

  useEffect(() => {
    let current = true;
    setLoading(true); setError(""); setSelection(null); setIds([]); setConfirmed(false);
    apiFetch<Selection>(`${base}/candidates`).then(data => { if (current) setSelection(data); })
      .catch(e => { if (current) setError(errorMessage(e)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [base, revision]);

  async function apply() {
    if (busy || !confirmed || ids.length !== selection?.count) return;
    setBusy(true); setError("");
    try {
      const result = await apiFetch<Applied>(`${base}/apply`, {
        method: "POST", body: JSON.stringify({ advisorIds: ids, targetSkillLevel: level }),
      });
      setApplied(result); onApplied();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (applied || selection?.applied) return <p className="cv-notice" role="status">
    Transfert enregistré : {(applied?.advisorIds ?? selection?.appliedAdvisorIds ?? []).length} conseiller(s).
    {applied && ` Le ${new Date(applied.appliedAt).toLocaleString("fr-FR")}.`}
  </p>;
  return <div className="cv-section" aria-busy={loading || busy}>
    <h3>Valider les conseillers à transférer</h3>
    <p className="cv-subtitle">Le transfert retire la compétence {skillNames[proposal.fromPool ?? ""] ?? proposal.fromPool} et ajoute {skillNames[proposal.toPool ?? ""] ?? proposal.toPool} au niveau confirmé. Les autres compétences et plafonds restent identiques. Seuls les conseillers sans conversation en cours sont proposés.</p>
    {error && <p role="alert" className="cv-error">{error}</p>}
    <button type="button" className="cv-button cv-button-secondary" disabled={busy || loading} onClick={() => setRevision(n => n + 1)}>Actualiser les conseillers éligibles</button>
    {loading && <p>Chargement des conseillers éligibles…</p>}
    {selection && <fieldset disabled={busy}>
      <legend>Choisissez exactement {selection.count} conseiller(s)</legend>
      {selection.candidates.map(candidate => <label key={candidate.id} className="cv-section" style={{ display: "block" }}>
        <input type="checkbox" checked={ids.includes(candidate.id)} disabled={!ids.includes(candidate.id) && ids.length >= selection.count}
          onChange={e => { setIds(current => e.target.checked ? [...current, candidate.id] : current.filter(id => id !== candidate.id)); setConfirmed(false); }} /> {candidate.displayName}
        <span className="cv-subtitle"> — {Object.keys(candidate.skills).map(skill => skillNames[skill] ?? skill).join(", ")}</span>
      </label>)}
      {selection.candidates.length < selection.count && <p className="cv-notice">La capacité disponible est insuffisante pour cette proposition. Configurez les profils nécessaires ou demandez une nouvelle analyse.</p>}
      <label className="cv-field">Niveau autorisé dans la compétence cible<select className="cv-input" value={level} onChange={e => { setLevel(Number(e.target.value)); setConfirmed(false); }}>
        <option value={1}>Niveau 1</option><option value={2}>Niveau 2</option><option value={3}>Niveau 3</option>
      </select></label>
      <label className="cv-section" style={{ display: "block" }}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Je confirme que les conseillers choisis sont habilités dans la compétence cible au niveau indiqué.</label>
      <button className="cv-button cv-section" disabled={busy || !confirmed || ids.length !== selection.count} onClick={() => void apply()}>
        {busy ? "Application…" : "Confirmer et appliquer le transfert"}
      </button>
      <p className="cv-subtitle">La disponibilité est vérifiée à nouveau au moment de la validation. Une proposition expire après 15 minutes.</p>
    </fieldset>}
  </div>;
}
