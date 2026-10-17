"use client";
import { useEffect, useRef, useState } from "react";
import { Play, RefreshCw, FlaskConical } from "lucide-react";
import { aiWorkspace, running, runNames, type SimulationMessage, type SimulationOptions, type SimulationRun, type SimulationSetup } from "@/lib/ai-workspace";
import { errorMessage } from "@/lib/api";

const initial: SimulationSetup = {
  scenarioId: "", strategyCode: "", seed: 42, profile: "CALME",
  objective: "Comprendre comment faire opposition à une carte perdue.",
  patience: 100, satisfaction: 50, maxTurns: 6, customerSegment: "MASS", tenureMonths: 12,
};
export default function SimulationStudio() {
  const [options, setOptions] = useState<SimulationOptions | null>(null);
  const [setup, setSetup] = useState(initial);
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selected, setSelected] = useState("");
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followError, setFollowError] = useState("");
  const [revision, setRevision] = useState(0);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [scenarioName, setScenarioName] = useState("");
  const mounted = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([aiWorkspace.options(controller.signal), aiWorkspace.runs(controller.signal)])
      .then(([catalog, recent]) => {
        if (controller.signal.aborted) return;
        setOptions(catalog); setRuns(recent);
        setSetup(s => ({ ...s, scenarioId: s.scenarioId || catalog.scenarios[0]?.id || "", strategyCode: s.strategyCode || catalog.strategies[0]?.code || "" }));
      }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [catalogRevision]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRun(null); setMessages([]); setFollowError("");
    async function follow() {
      try {
        const [record, transcript] = await Promise.all([
          aiWorkspace.run(selected, controller.signal), aiWorkspace.transcript(selected, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setRun(record); setMessages(transcript); setFollowError("");
        setRuns(items => [record, ...items.filter(item => item.runId !== record.runId)].slice(0, 20));
        if (running(record)) timer = setTimeout(() => void follow(), 3000);
      } catch (e) { if (!controller.signal.aborted) setFollowError(errorMessage(e)); }
    }
    void follow();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [selected, revision]);
  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const record = await aiWorkspace.start({ ...setup, objective: setup.objective.trim() });
      if (!mounted.current) return;
      setRuns(items => [record, ...items.filter(item => item.runId !== record.runId)].slice(0, 20));
      setSelected(record.runId); setRevision(n => n + 1);
      setSetup(s => ({ ...s, seed: s.seed === Number.MAX_SAFE_INTEGER ? 1 : s.seed + 1 }));
    } catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  const numberField = (key: "seed" | "patience" | "satisfaction" | "maxTurns" | "tenureMonths", label: string, min: number, max: number) =>
    <label className="cv-label">{label}<input className="cv-input" type="number" required min={min} max={max} step={1} value={setup[key]} onChange={e => setSetup(s => ({ ...s, [key]: Number(e.target.value) }))} /></label>;
  return <section className="cv-section" id="simulation">
    <div className="cv-ai-card-heading"><div><p className="cv-eyebrow"><FlaskConical size={15} /> SIMULATION</p><h2 className="cv-tool-title">Faites dialoguer deux agents</h2>
      <p className="cv-subtitle">Un client synthétique échange avec le conseiller IA, sans intervenir dans les files live.</p></div>
      <button className="cv-button cv-button-secondary" disabled={loading || busy} onClick={() => setCatalogRevision(n => n + 1)}><RefreshCw size={14} />Actualiser les scénarios</button></div>
    {error && <p role="alert" className="cv-error cv-section">{error}</p>}
    <details className="cv-card cv-card-pad cv-section"><summary>Créer un scénario de dialogue</summary>
      <p className="cv-subtitle cv-section">Donnez un nom à votre essai. Les paramètres du client et du dialogue se choisissent ci-dessous.</p>
      <form className="cv-ai-lookup cv-section" onSubmit={async e => {
        e.preventDefault(); if (inFlight.current || !scenarioName.trim()) return;
        inFlight.current = true; setBusy(true); setError("");
        try {
          const scenario = await aiWorkspace.createScenario(scenarioName);
          if (!mounted.current) return;
          setOptions(o => o ? { ...o, scenarios: [...o.scenarios, scenario] } : o);
          setSetup(s => ({ ...s, scenarioId: scenario.id })); setScenarioName("");
        } catch (e) { if (mounted.current) setError(errorMessage(e)); }
        finally { inFlight.current = false; if (mounted.current) setBusy(false); }
      }}><label className="cv-label">Nom du scénario<input className="cv-input" required maxLength={120} value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="Ex. Opposition carte — client calme" /></label>
        <button className="cv-button cv-button-secondary" disabled={busy || loading || !options || !scenarioName.trim()}>Créer le scénario</button></form>
    </details>
    <div className="cv-ai-studio-grid cv-section">
      <form className="cv-card cv-card-pad cv-stack" onSubmit={start}>
        <h3 className="cv-tool-title">Configurer le dialogue</h3>
        {loading && <p role="status">Chargement des scénarios…</p>}
        {options && (!options.scenarios.length || !options.strategies.length) && <p className="cv-notice">Aucun scénario ou stratégie disponible. Demandez à l’administrateur de configurer les références de simulation.</p>}
        <fieldset disabled={busy || loading || !options} className="cv-ai-fields">
          <label className="cv-label">Scénario<select className="cv-input" required value={setup.scenarioId} onChange={e => setSetup(s => ({ ...s, scenarioId: e.target.value }))}><option value="">Choisir un scénario</option>{options?.scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="cv-label">Référence de stratégie<select className="cv-input" required value={setup.strategyCode} onChange={e => setSetup(s => ({ ...s, strategyCode: e.target.value }))}><option value="">Choisir une stratégie</option>{options?.strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select></label>
          <p className="cv-subtitle">La stratégie identifie le run. Ce dialogue ne mesure pas les performances de répartition des effectifs.</p>
          <label className="cv-label">Objectif du client<textarea className="cv-input" required maxLength={1000} rows={3} value={setup.objective} onChange={e => setSetup(s => ({ ...s, objective: e.target.value }))} /></label>
          <div className="cv-ai-form-grid"><label className="cv-label">Profil<select className="cv-input" value={setup.profile} onChange={e => setSetup(s => ({ ...s, profile: e.target.value }))}>{Object.entries({ CALME: "Calme", IMPATIENT: "Impatient", INSATISFAIT: "Insatisfait", EXIGEANT: "Exigeant", OFFRE: "En recherche d’offre", CHURN: "Risque de départ" }).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <label className="cv-label">Segment<select className="cv-input" value={setup.customerSegment} onChange={e => setSetup(s => ({ ...s, customerSegment: e.target.value }))}>{Object.entries({ MASS: "Particulier", AFFLUENT: "Patrimonial", PRIVATE: "Banque privée", PROFESSIONAL: "Professionnel" }).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            {numberField("seed", "Graine", 0, Number.MAX_SAFE_INTEGER)}{numberField("maxTurns", "Maximum de tours client", 1, 50)}
            {numberField("patience", "Patience initiale / 100", 0, 100)}{numberField("satisfaction", "Satisfaction initiale / 100", 0, 100)}
            {numberField("tenureMonths", "Ancienneté (mois)", 0, 2147483647)}</div>
          <button className="cv-button" disabled={!setup.scenarioId || !setup.strategyCode || !setup.objective.trim()}><Play size={15} />{busy ? "Lancement…" : "Lancer la simulation"}</button>
        </fieldset>
        <p className="cv-subtitle">Chaque combinaison scénario, stratégie et graine est unique. La graine suivante est proposée après le lancement.</p>
      </form>
      <div className="cv-card cv-card-pad">
        <div className="cv-ai-card-heading"><h3 className="cv-tool-title">Suivi du dialogue</h3><button className="cv-button cv-button-secondary cv-button-small" disabled={!selected} onClick={() => setRevision(n => n + 1)}><RefreshCw size={14} />Actualiser le suivi</button></div>
        <label className="cv-label cv-section">Simulations récentes<select className="cv-input" value={selected} onChange={e => { setSelected(e.target.value); setRun(null); setMessages([]); setFollowError(""); }}><option value="">Sélectionner une simulation</option>{runs.map(r => <option key={r.runId} value={r.runId}>{r.startedAt ? new Date(r.startedAt).toLocaleString("fr-FR") : "Simulation"} · {runNames[r.status]} · {r.runId.slice(0, 8)}</option>)}</select></label>
        {followError && <p role="alert" className="cv-error cv-section">{followError} Le suivi est suspendu ; utilisez « Actualiser le suivi » pour réessayer.</p>}
        {run && <div className="cv-notice cv-section" role="status"><strong>{runNames[run.status]}</strong><p>{run.messageCount} message(s) · {run.conversationStatus === "RESOLVED" ? "Conversation résolue" : run.conversationStatus === "ABANDONED" ? "Client parti" : "Dialogue simulé"}</p>{running(run) && <p>Le suivi s’actualise automatiquement.</p>}{run.errorMessage && <p>{run.errorMessage}</p>}</div>}
        {!selected && <p className="cv-notice cv-section">Lancez un dialogue ou sélectionnez une simulation récente pour consulter ses échanges.</p>}
        {selected && !run && !followError && <p role="status" className="cv-section">Chargement du dialogue…</p>}
        <div className="cv-ai-transcript cv-section" aria-label="Transcription simulée">{messages.map(m => <article className={"cv-ai-turn " + (m.sender === "ADVISOR" ? "cv-ai-turn-advisor" : "")} key={m.id}><strong>{m.sender === "ADVISOR" ? "Conseiller IA" : m.sender === "CUSTOMER" ? "Client simulé" : "Système"}</strong><p>{m.content}</p></article>)}</div>
      </div>
    </div>
  </section>;
}
