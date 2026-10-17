"use client";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { aiWorkspace, criterionNames, type QualityEvaluation } from "@/lib/ai-workspace";
import { errorMessage } from "@/lib/api";

export default function QualityCard({ conversationId, status }: { conversationId: string; status: string }) {
  const [evaluations, setEvaluations] = useState<QualityEvaluation[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (status !== "RESOLVED") return;
    const controller = new AbortController();
    setBusy(true); setError(""); setEvaluations([]);
    aiWorkspace.quality(conversationId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setEvaluations(data); })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [conversationId, status, revision]);
  if (status !== "RESOLVED") return null;
  return <section className="cv-card cv-card-pad cv-section" aria-busy={busy}>
    <div className="cv-ai-card-heading"><div><p className="cv-eyebrow"><ShieldCheck size={15} /> QUALITÉ</p><h2 className="cv-tool-title">Évaluation de la conversation</h2></div>
      <button className="cv-button cv-button-secondary" disabled={busy} onClick={() => setRevision(n => n + 1)}><RefreshCw size={14} />Actualiser l’évaluation</button></div>
    {error ? <p role="alert" className="cv-error cv-section">{error}</p> : busy ? <p role="status" className="cv-notice cv-section">Chargement de l’évaluation…</p>
      : evaluations.length === 0 ? <p className="cv-notice cv-section">Aucune évaluation enregistrée pour le moment. L’analyse est asynchrone ; vous pouvez actualiser dans quelques instants.</p>
      : evaluations.map(e => <article key={e.id} className="cv-section"><div className="cv-ai-score"><strong>{e.globalScore.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}<small> / 10</small></strong>
        <span>{e.evaluator === "AI" ? "Évaluation IA" : "Évaluation humaine"} · {new Date(e.createdAt).toLocaleString("fr-FR")}</span></div>
        <div className="cv-ai-criteria">{Object.entries(e.scores).map(([key, score]) => <div key={key}><span>{criterionNames[key.toUpperCase()] || key}</span><strong>{score} / 10</strong></div>)}</div>
        {e.explanation && <p className="cv-section" style={{ whiteSpace: "pre-wrap" }}>{e.explanation}</p>}</article>)}
    <p className="cv-subtitle cv-section">Une aide à la revue qualité. Le score ne constitue pas une validation de conformité bancaire.</p>
  </section>;
}
