"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";

type Explanation = {
  decisionRecorded: boolean;
  intent: string | null;
  confidence: number | null;
  action: string;
  reason: string;
  latencyMs: number | null;
  sources: { articleId: string; title: string; score: number | null }[];
  checks: { tool: string; ok: boolean }[];
};
const labels: Record<string, string> = {
  BALANCE: "Comptes et solde", CARD: "Carte bancaire", CREDIT: "Crédit", FRAUD: "Fraude",
  ACCOUNT_CLOSURE: "Clôture de compte", OTHER: "Demande générale",
  get_customer: "Consultation du profil client", get_accounts: "Consultation des comptes",
  get_transactions: "Consultation des opérations", search_knowledge_base: "Recherche documentaire",
  create_ticket: "Création d’un ticket", update_customer: "Mise à jour du profil",
};

export default function AiMessageExplanation({ conversationId, messageId, onOpen }: { conversationId: string; messageId: number; onOpen?: () => void }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Explanation | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (open && (data || error)) details.current?.scrollIntoView({ block: "nearest" });
  }, [open, data, error]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setError("");
    setData(null);
    apiFetch<Explanation>(`/conversations/${conversationId}/messages/${messageId}/explanation`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [open, conversationId, messageId, attempt]);
  return <details ref={details} className="cv-ai-explanation" onToggle={event => {
    setOpen(event.currentTarget.open);
    if (event.currentTarget.open) onOpen?.();
  }}>
    <summary>Pourquoi cette réponse ?</summary>
    {open && <div>
      {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Réessayer</button></p>
        : !data ? <p>Chargement de l’explication…</p> : <>
          <p>{data.reason}</p>
          {data.decisionRecorded && <p><strong>Sujet :</strong> {labels[data.intent || ""] || "Non précisé"}. <strong>Suite demandée :</strong> {data.action === "ESCALATE" ? "reprise humaine" : data.action === "NONE" ? "réponse au client" : data.action === "CREATE_TICKET" ? "création de ticket" : "revue de l’action"}.</p>}
          {data.confidence != null && <p>Confiance déclarée : {Math.round(data.confidence * 100)} %. Cette estimation ne mesure pas la fiabilité réelle.</p>}
          <p><strong>Documents utilisés :</strong> {data.sources.length ? data.sources.map(source => source.title).join(" ; ") : "aucun document cité"}.</p>
          <p><strong>Vérifications et actions :</strong></p>
          {data.checks.length ? <ul>{data.checks.map((check, index) => <li key={index}>{labels[check.tool] || check.tool} : {check.ok ? "réussie" : "échouée"}</li>)}</ul> : <p>Aucune consultation de dossier ni opération bancaire enregistrée.</p>}
          <p>Une demande de reprise humaine ne clôture pas la discussion. Un membre de l’équipe doit intervenir et valider son traitement.</p>
        </>}
    </div>}
  </details>;
}
