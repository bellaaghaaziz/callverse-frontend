"use client";
import { useEffect, useRef, useState } from "react";
import { FlaskConical, Play, RefreshCw } from "lucide-react";
import { ApiError, errorMessage } from "@/lib/api";
import { summarizeTwinRuns, twinApi, twinPercent, twinStrategies, twinWait, type TwinRun, type TwinScenario, type TwinStrategy } from "@/lib/twin";
import SimulationStudio from "@/components/ai/SimulationStudio";

export default function TwinLab() {
  const [scenarios, setScenarios] = useState<TwinScenario[]>([]);
  const [scenarioId, setScenarioId] = useState("");
  const [seed, setSeed] = useState(7);
  const [runs, setRuns] = useState<TwinRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [states, setStates] = useState<Partial<Record<TwinStrategy, string>>>({});
  const [revision, setRevision] = useState(0);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const inFlight = useRef(false);
  const activeRun = useRef<AbortController | null>(null);
  useEffect(() => () => activeRun.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setCatalogError("");
    twinApi.scenarios(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      // Single-dialogue scenarios have no centre staffing; they remain in the dialogue panel.
      const usable = items.filter(item => item.advisorCount >= 4);
      setScenarios(usable); setScenarioId(id => usable.some(item => item.id === id) ? id : usable[0]?.id || "");
    }).catch(e => { if (!controller.signal.aborted) {setCatalogError(errorMessage(e)); setAccessDenied(e instanceof ApiError && e.status === 403);} })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [catalogRevision]);
  useEffect(() => {
    const controller = new AbortController(); setRuns([]); setError(""); setStates({});
    if (scenarioId) twinApi.compare(scenarioId, controller.signal).then(items => {
      if (!controller.signal.aborted) setRuns(items);
    }).catch(e => { if (!controller.signal.aborted) {setError(errorMessage(e)); setAccessDenied(e instanceof ApiError && e.status === 403);} });
    return () => controller.abort();
  }, [scenarioId, revision]);
  const scenario = scenarios.find(item => item.id === scenarioId);
  const summary = summarizeTwinRuns(runs);
  const differentSeeds = summary.length > 1 && summary.some(item => item.seeds.join(",") !== summary[0].seeds.join(","));
  async function launch(only?: TwinStrategy) {
    if (inFlight.current || !scenarioId) return;
    if (!Number.isSafeInteger(seed) || seed < 0) { setError("Choisissez une graine entière positive ou nulle."); return; }
    inFlight.current = true; setBusy(true); setError("");
    const controller = new AbortController(); activeRun.current = controller;
    const update = (code: TwinStrategy, text: string) => { if (!controller.signal.aborted) setStates(previous => ({ ...previous, [code]: text })); };
    try {
      for (const { code } of twinStrategies.filter(item => !only || item.code === only)) {
        if (controller.signal.aborted) break;
        update(code, "Calcul en cours…");
        try { await twinApi.run(scenarioId, code, seed, controller.signal); update(code, "Calcul terminé"); }
        catch (e) {
          if (controller.signal.aborted) break;
          if (e instanceof ApiError && e.status === 409 && e.code === "SIMULATION_RUN_ALREADY_EXISTS") update(code, "Déjà calculé");
          else if (e instanceof ApiError && e.status === 503) update(code, "Indisponible — Réessayer");
          else { update(code, "Échec du calcul"); setError(e instanceof ApiError && e.status === 400 ? e.detail || errorMessage(e) : errorMessage(e)); if (e instanceof ApiError && [400,403].includes(e.status)) break; }
        }
      }
      if (!controller.signal.aborted) setRuns(await twinApi.compare(scenarioId, controller.signal));
    } catch (e) { if (!controller.signal.aborted) setError(errorMessage(e)); }
    finally { inFlight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  if (accessDenied) return <p role="alert" className="cv-error cv-section">Accès refusé. Cet espace est réservé aux superviseurs et administrateurs.</p>;
  return <div className="cv-stack" id="twin">
    <div className="cv-page-heading"><div><p className="cv-eyebrow">SIMULATION DU CENTRE</p><h1>Votre jumeau numérique.</h1><p className="cv-subtitle">Comparez trois façons d’organiser les équipes sur une même journée simulée.</p></div></div>
    <section className="cv-card cv-card-pad" data-tour="twin-setup">
      <div className="cv-ai-card-heading"><div><p className="cv-eyebrow"><FlaskConical size={15} /> EXPÉRIMENTATION</p><h2 className="cv-tool-title">Préparer la comparaison</h2></div>
        <button type="button" className="cv-button cv-button-secondary" disabled={busy || loading} onClick={() => setCatalogRevision(n => n + 1)}><RefreshCw size={14} />Actualiser les scénarios</button></div>
      {catalogError && <p role="alert" className="cv-error cv-section">{catalogError}</p>}
      {loading && <p role="status" className="cv-section">Chargement des scénarios…</p>}
      {!loading && !catalogError && !scenarios.length && <p className="cv-notice cv-section">Aucun scénario de centre disponible. Demandez à l’administrateur de préparer les scénarios.</p>}
      <form className="cv-directory-toolbar cv-section" onSubmit={e => {e.preventDefault(); void launch();}}>
        <label className="cv-label">Scénario du centre<select aria-label="Scénario du centre" className="cv-input" required disabled={busy || loading} value={scenarioId} onChange={e => setScenarioId(e.target.value)}><option value="">Choisir une journée</option>{scenarios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="cv-label">Graine de comparaison<input className="cv-input" required type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} disabled={busy} value={Number.isNaN(seed) ? "" : seed} onChange={e => {setSeed(e.target.valueAsNumber); setStates({});}} /></label>
        <button className="cv-button" disabled={busy || loading || !scenarioId}><Play size={15} />{busy ? "Calcul en cours…" : "Lancer les 3 stratégies"}</button>
      </form>
      {scenario && <p className="cv-subtitle">{scenario.durationMinutes} minutes simulées · {scenario.advisorCount} conseillers. Une même graine rejoue les mêmes arrivées pour les trois stratégies.</p>}
      {error && <p role="alert" className="cv-error cv-section">{error}</p>}
      <div className="cv-ai-criteria cv-section" aria-live="polite">{twinStrategies.map(item => <div key={item.code}><span><strong>{item.name}</strong><br />{item.detail}<br /><span>{states[item.code] || "Prêt à calculer"}</span></span>
        {states[item.code]?.startsWith("Indisponible") && <button type="button" className="cv-button cv-button-secondary cv-button-small" disabled={busy} onClick={() => void launch(item.code)}>Réessayer {item.name}</button>}</div>)}</div>
    </section>
    <section className="cv-card cv-card-pad" data-tour="twin-results">
      <div className="cv-ai-card-heading"><h2 className="cv-tool-title">Comparer les résultats</h2><button type="button" className="cv-button cv-button-secondary" disabled={busy || !scenarioId} onClick={() => setRevision(n => n + 1)}>Actualiser les résultats</button></div>
      {!summary.length ? <p className="cv-notice cv-section">Aucun résultat pour ce scénario. Lancez les trois stratégies.</p> : <>
        <p className="cv-subtitle cv-section">Moyennes des calculs terminés, regroupées par stratégie. Le SLA est calculé sur toutes les arrivées, abandons compris.</p>
        {differentSeeds && <p role="status" className="cv-notice cv-section">Les stratégies n’ont pas encore les mêmes graines. Lancez les trois avec la même graine pour une comparaison équitable.</p>}
        <div className="cv-twin-charts">{([{key:"slaRatio",name:"SLA",format:twinPercent}, {key:"abandonRatio",name:"Abandons",format:twinPercent}, {key:"avgWaitSeconds",name:"Attente moyenne",format:twinWait}] as const).map(metric => {
          const max = metric.key === "avgWaitSeconds" ? Math.max(1,...summary.map(item => item.kpis.avgWaitSeconds)) : 1;
          return <div key={metric.key} className="cv-twin-chart"><h3>{metric.name}</h3>{summary.map(item => <div key={item.strategy} className="cv-twin-bar-row"><span>{twinStrategies.find(strategy => strategy.code === item.strategy)!.name}</span><div className="cv-twin-track" aria-hidden="true"><div className={"cv-twin-bar cv-twin-bar-"+item.strategy} style={{width:`${Math.max(0,Math.min(100,item.kpis[metric.key]/max*100))}%`}} /></div><strong>{metric.format(item.kpis[metric.key])}</strong></div>)}</div>;
        })}</div>
        <div className="cv-table-wrap cv-section"><table className="cv-table"><caption className="sr-only">Comparaison des stratégies du jumeau numérique</caption><thead><tr><th>Stratégie</th><th>Graines</th><th>Clients</th><th>SLA</th><th>Abandons</th><th>Attente</th><th>P95</th></tr></thead><tbody>{summary.map(item => <tr key={item.strategy}><td>{twinStrategies.find(strategy => strategy.code === item.strategy)!.name}</td><td>{item.seeds.join(", ")}</td><td>{Math.round(item.kpis.totalConversations).toLocaleString("fr-FR")}</td><td>{twinPercent(item.kpis.slaRatio)}</td><td>{twinPercent(item.kpis.abandonRatio)}</td><td>{twinWait(item.kpis.avgWaitSeconds)}</td><td>{twinWait(item.kpis.p95WaitSeconds)}</td></tr>)}</tbody></table></div>
        <p className="cv-notice cv-section">Dans les évaluations du projet, PPO améliore le SLA mais augmente les abandons à charge faible et moyenne. Examinez ces deux indicateurs ensemble.</p>
      </>}
    </section>
    <SimulationStudio />
  </div>;
}
