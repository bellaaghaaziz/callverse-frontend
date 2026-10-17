"use client";
import { useState } from "react";
import { adaptSuggestion, adaptQuality, adaptWorkforce, adaptSimulationTurn } from "@/lib/ai";

export default function AiLab({ supervision = false }: { supervision?: boolean }) {
  const [feature, setFeature] = useState("suggestion");
  const [conversationId, setConversationId] = useState("");
  const [objective, setObjective] = useState("Je souhaite comprendre comment faire opposition à ma carte perdue.");
  const [strategy, setStrategy] = useState("THRESHOLD");
  const [scenario, setScenario] = useState(JSON.stringify({
    queues: { ACCOUNT: 0, CARD: 15, CREDIT: 0, ADVISORY: 0 },
    avg_wait: { ACCOUNT: 0, CARD: 180, CREDIT: 0, ADVISORY: 0 },
    available: { ACCOUNT: 2, CARD: 0, CREDIT: 1, ADVISORY: 1 },
    sla_today: .8, hour: 10, trend: 1,
  }, null, 2));
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function request(body?: unknown) {
    const response = await fetch("/api/ai-preview", {
      method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionStorage.getItem("jwt") },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || "Service IA indisponible.");
    return json;
  }
  async function run() {
    setBusy(true); setError(""); setResult(null);
    try {
      const body = feature === "workforce" ? { feature, strategy, state: JSON.parse(scenario) }
        : feature === "simulation" ? { feature, scenario: { conversation_id: crypto.randomUUID(), history: [], wait_seconds: 0,
          state: { profile: "calme", patience: 100, satisfaction: 50, objective, objective_met: false } } }
        : { feature, conversationId: conversationId.trim() };
      const raw = await request(body);
      const adapted = feature === "suggestion" ? adaptSuggestion(raw) : feature === "quality" ? adaptQuality(raw)
        : feature === "workforce" ? adaptWorkforce(raw) : adaptSimulationTurn(raw);
      if (!adapted) throw new Error("Réponse IA incompatible avec le contrat attendu.");
      setResult(adapted);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur IA."); }
    finally { setBusy(false); }
  }
  const suggestion = feature === "suggestion" && result ? result as NonNullable<ReturnType<typeof adaptSuggestion>> : null;
  return <section className="cv-card cv-card-pad cv-section" id="ai-lab">
    <h2 className="cv-tool-title">Laboratoire IA</h2>
    <p className="cv-subtitle">Essais isolés : aucune réponse envoyée au client et aucune modification métier automatique.</p>
    <p className="cv-notice">Le conseiller utilise les lectures autorisées et la recherche textuelle des procédures. Le type de contrat, le risque de départ et le nombre de tickets ne sont pas fournis dans le contexte. Le RAG vectoriel n’est pas activé ici.</p>
    <button className="cv-button cv-button-secondary" data-tour="lab-health" disabled={busy} onClick={async () => {
      setBusy(true); setError(""); try { const data = await request(); setStatus("Service connecté · " + (data.workforce.model_file_present ? "modèle PPO présent" : "modèle PPO absent")); }
      catch (e) { setError(e instanceof Error ? e.message : "Service indisponible"); } finally { setBusy(false); }
    }}>Vérifier le service IA</button>
    {status && <p role="status" className="cv-notice">{status}</p>}
    <form className="cv-stack cv-section" data-tour="lab-form" onSubmit={e => { e.preventDefault(); void run(); }}>
      <label className="cv-label">Fonction IA<select className="cv-input" value={feature} disabled={busy} onChange={e => { setFeature(e.target.value); setResult(null); setError(""); }}>
        <option value="suggestion">Suggestion conseiller</option><option value="simulation">Premier message d’un client simulé</option>
        {supervision && <><option value="quality">Évaluation qualité</option><option value="workforce">Proposition d’effectifs</option></>}
      </select></label>
      {["suggestion", "quality"].includes(feature) && <label className="cv-label">Conversation à analyser<input className="cv-input" required value={conversationId} onChange={e => setConversationId(e.target.value)} placeholder="Identifiant de conversation" /></label>}
      {feature === "simulation" && <label className="cv-label">Objectif du client simulé<textarea className="cv-input" required value={objective} onChange={e => setObjective(e.target.value)} /></label>}
      {feature === "workforce" && <>
        <p className="cv-notice">Scénario synthétique modifiable : ADVISORY appartient au modèle IA et ne correspond pas à la file FRAUD. Ces effectifs ne sont pas ceux de la banque.</p>
        <label className="cv-label">Stratégie<select className="cv-input" value={strategy} onChange={e => setStrategy(e.target.value)}><option>THRESHOLD</option><option>STATIC_FIFO</option><option>PPO</option></select></label>
        <label className="cv-label">État du scénario (JSON)<textarea className="cv-input" rows={12} value={scenario} onChange={e => setScenario(e.target.value)} /></label>
      </>}
      <button className="cv-button" disabled={busy}>{busy ? "Analyse en cours…" : "Lancer l’essai IA"}</button>
    </form>
    {error && <p className="cv-error cv-section" role="alert">{error}</p>}
    {suggestion && <div className="cv-notice cv-section"><h3>Proposition de réponse</h3><p style={{whiteSpace:"pre-wrap"}}>{suggestion.reply}</p><p>Confiance : {suggestion.confidence === null ? "inconnue" : Math.round(suggestion.confidence * 100) + " %"} · Action proposée : {suggestion.suggestedAction.type}</p><p>Les scores de sources à 0 indiquent une recherche textuelle sans score vectoriel.</p></div>}
    {result !== null && <details className="cv-section" open={!suggestion}><summary>Résultat détaillé</summary><pre style={{whiteSpace:"pre-wrap", overflowWrap:"anywhere", fontSize:12}}>{JSON.stringify(result, null, 2)}</pre></details>}
  </section>;
}
