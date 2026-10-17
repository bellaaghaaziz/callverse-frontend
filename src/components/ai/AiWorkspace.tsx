"use client";
import { useState } from "react";
import WorkforceCard from "./WorkforceCard";
import SimulationStudio from "./SimulationStudio";
import QualityCard from "./QualityCard";
import { apiFetch, errorMessage } from "@/lib/api";
import type { Conversation } from "@/lib/contracts";

export default function AiWorkspace() {
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="cv-ai-workspace"><div className="cv-page-heading"><div><p className="cv-eyebrow">INTELLIGENCE ARTIFICIELLE</p><h1>Analysez, simulez, améliorez.</h1><p className="cv-subtitle">Des recommandations sur votre activité et des dialogues simulés dans un espace dédié.</p></div></div>
    <WorkforceCard /><SimulationStudio />
    <section className="cv-card cv-card-pad cv-section" data-tour="quality-lookup"><h2 className="cv-tool-title">Consulter une évaluation qualité</h2><p className="cv-subtitle">Vous pouvez aussi ouvrir une conversation résolue depuis la supervision.</p>
      <form className="cv-ai-lookup cv-section" onSubmit={async e => {
        e.preventDefault(); if (busy) return; setBusy(true); setError(""); setConversation(null);
        try { setConversation(await apiFetch<Conversation>(`/conversations/${encodeURIComponent(draft.trim())}`)); }
        catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
      }}><label className="cv-label">Référence de conversation<input className="cv-input" required pattern="[0-9a-fA-F\-]{36}" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Identifiant de la conversation live" /></label><button className="cv-button cv-button-secondary" disabled={busy}>{busy ? "Recherche…" : "Consulter"}</button></form>
      {error && <p className="cv-error cv-section" role="alert">{error}</p>}
      {conversation && conversation.status !== "RESOLVED" && <p className="cv-notice cv-section">L’évaluation est déclenchée après la résolution de la conversation.</p>}
      {conversation && <QualityCard key={conversation.id} conversationId={conversation.id} status={conversation.status} />}
    </section>
  </div>;
}
