"use client";
import { useRef, useEffect, useState } from "react";
import { Users, Sparkles } from "lucide-react";
import { aiWorkspace, skillNames, type WorkforceRecommendation } from "@/lib/ai-workspace";
import { ApiError, errorMessage } from "@/lib/api";

export default function WorkforceCard() {
  const [result, setResult] = useState<WorkforceRecommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function analyze() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(""); setResult(null);
    try { const data = await aiWorkspace.workforce(); if (mounted.current) setResult(data); }
    catch (e) { if (mounted.current) { if (e instanceof ApiError && e.status === 403) setAccessDenied(true); else setError(errorMessage(e)); } }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  if (accessDenied) return null;
  const actions: Record<string, string> = {
    NOOP: "Conserver l’organisation", NO_OP: "Conserver l’organisation", NONE: "Conserver l’organisation",
    REALLOCATE: "Rééquilibrer les équipes", REASSIGN: "Rééquilibrer les équipes",
    ADD_CAPACITY: "Renforcer la capacité", ESCALATE: "Demander une revue",
  };
  return <section className="cv-card cv-card-pad cv-section" id="workforce" aria-busy={busy}>
    <div className="cv-ai-card-heading"><div><p className="cv-eyebrow"><Users size={15} /> EFFECTIFS</p>
      <h2 className="cv-tool-title">Une recommandation pour votre équipe</h2>
      <p className="cv-subtitle">Analysez les files et les capacités actuelles pour préparer votre décision.</p></div>
      <button className="cv-button" disabled={busy} onClick={() => void analyze()}><Sparkles size={15} />{busy ? "Analyse en cours…" : "Analyser les effectifs"}</button>
    </div>
    {error && <p className="cv-error cv-section" role="alert">{error}</p>}
    {result && <div className="cv-section" aria-live="polite">
      <div className="cv-notice"><strong>{actions[result.type] || "Proposition d’organisation"}</strong>
        <p>{result.reason}</p>
        {result.fromPool && result.toPool && <p>{skillNames[result.fromPool] || result.fromPool} → {skillNames[result.toPool] || result.toPool}{result.count != null ? ` · ${result.count} conseiller(s)` : ""}</p>}
        <p>Aucune affectation n’a été modifiée. Cette proposition nécessite votre revue.</p>
        {result.caveats?.length > 0 && <ul className="cv-subtitle">{result.caveats.map((caveat, index) => <li key={index}>{caveat}</li>)}</ul>}
        <button type="button" className="cv-button cv-button-secondary" disabled>Appliquer — validation humaine à venir</button>
      </div>
      <div className="cv-table-wrap cv-section"><table className="cv-table"><caption className="sr-only">Données utilisées pour la recommandation</caption>
        <thead><tr><th>Compétence</th><th>En attente</th><th>Attente moyenne</th><th>Disponibles</th></tr></thead>
        <tbody>{Object.entries(skillNames).map(([skill, name]) => <tr key={skill}><td>{name}</td><td>{result.observation.queues[skill] ?? "—"}</td>
          <td>{result.observation.averageWaitSeconds[skill] == null ? "—" : `${Math.round(result.observation.averageWaitSeconds[skill])} s`}</td><td>{result.observation.available[skill] ?? "—"}</td></tr>)}</tbody>
      </table></div>
      <p className="cv-subtitle">Les conseillers polyvalents peuvent figurer dans plusieurs compétences. La tendance utilise une valeur neutre.
        {!result.observation.slaMeasured && " Aucun SLA n’est encore mesuré aujourd’hui : une valeur neutre a été utilisée."}</p>
      <p className="cv-subtitle">Analyse du {new Date(result.generatedAt).toLocaleString("fr-FR")} · Référence {result.decisionId}</p>
    </div>}
  </section>;
}
