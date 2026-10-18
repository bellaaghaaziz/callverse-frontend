"use client";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import { intentLabel } from "@/lib/presentation";
import { referenceAdmin, type ReferenceOptions, type RoutingRecord, type SlaRecord } from "@/lib/reference-admin";
import { DeleteReference, ReferenceFeedback } from "./ReferenceControls";

const emptySla = { skill: "", seconds: "60", ratioPercent: "80", active: true };
const emptyRoute = { name: "", intent: "", skill: "ACCOUNTS", priority: "100", active: true };
export default function AdminRules() {
  const [options, setOptions] = useState<ReferenceOptions | null>(null), [policies, setPolicies] = useState<SlaRecord[]>([]), [rules, setRules] = useState<RoutingRecord[]>([]);
  const [policy, setPolicy] = useState<SlaRecord | null>(null), [rule, setRule] = useState<RoutingRecord | null>(null);
  const [sla, setSla] = useState(emptySla), [route, setRoute] = useState(emptyRoute);
  const [revision, setRevision] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    Promise.all([referenceAdmin.options(controller.signal), referenceAdmin.slaPolicies(controller.signal), referenceAdmin.routingRules(controller.signal)])
      .then(([nextOptions, nextPolicies, nextRules]) => { setOptions(nextOptions); setPolicies(nextPolicies); setRules(nextRules); })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  function chooseSla(item: SlaRecord | null) {
    setPolicy(item); setError(""); setNotice(""); setSla(item ? { skill: item.skill || "", seconds: String(item.targetSeconds), ratioPercent: String(Number((item.targetRatio * 100).toFixed(1))), active: item.active } : emptySla);
  }
  function chooseRoute(item: RoutingRecord | null) {
    setRule(item); setError(""); setNotice(""); setRoute(item ? { name: item.name, intent: item.intent || "", skill: item.skill, priority: String(item.priority), active: item.active } : emptyRoute);
  }
  async function perform(action: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try { await action(); setRevision(n => n + 1); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const skillLabel = (code: string | null) => code ? options?.skills.find(s => s.code === code)?.label || code : "Politique globale";
  return <div className="cv-stack"><section className="cv-card cv-card-pad"><div className="cv-toolbar"><div className="grow"><h2>Règles opérationnelles</h2><p className="cv-subtitle">Les règles d’orientation s’appliquent aux nouveaux contacts. Les objectifs SLA sont lus lors de la prise en charge ; les mesures historiques restent conservées.</p></div><button className="cv-button cv-button-secondary" disabled={busy || loading} onClick={() => setRevision(n => n + 1)}>Actualiser les règles</button></div><ReferenceFeedback error={error} notice={notice} loading={loading} /></section>
    <section className="cv-card cv-card-pad"><h2>Objectifs de service (SLA)</h2><p className="cv-subtitle">Une politique active par compétence ; une politique globale couvre les compétences sans objectif propre. La dernière couverture active ne peut pas être supprimée.</p>
      <div className="cv-table-wrap cv-section"><table className="cv-table"><caption className="sr-only">Politiques SLA</caption><thead><tr><th>Compétence</th><th>Délai</th><th>Objectif</th><th>État</th><th>Action</th></tr></thead><tbody>{policies.map(item => <tr key={item.id}><td>{skillLabel(item.skill)}</td><td>{item.targetSeconds} s</td><td>{(item.targetRatio * 100).toLocaleString("fr-FR")} %</td><td>{item.active ? "Active" : "Inactive"}</td><td><button className="cv-button cv-button-secondary cv-button-small" disabled={busy} onClick={() => chooseSla(item)}>Modifier {skillLabel(item.skill)}</button></td></tr>)}</tbody></table></div>
      <form className="cv-stack cv-section" onSubmit={e => { e.preventDefault(); void perform(async () => {
        const result = await referenceAdmin.saveSla(policy?.id || null, { skill: sla.skill || null, targetSeconds: Number(sla.seconds), targetRatio: Number((Number(sla.ratioPercent) / 100).toFixed(3)), active: sla.active }); chooseSla(result); setNotice("Politique SLA enregistrée.");
      }); }}><fieldset disabled={busy || loading || !options} className="cv-stack"><h3>{policy ? "Modifier l’objectif" : "Ajouter un objectif"}</h3><div className="cv-form-row">
        <label className="cv-field"><span className="cv-label">Compétence SLA</span><select className="cv-input" value={sla.skill} onChange={e => setSla(s => ({ ...s, skill: e.target.value }))}><option value="">Globale (défaut)</option>{options?.skills.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}</select></label>
        <label className="cv-field"><span className="cv-label">Délai cible (secondes)</span><input className="cv-input" required type="number" min={1} max={86400} step={1} value={sla.seconds} onChange={e => setSla(s => ({ ...s, seconds: e.target.value }))} /></label>
        <label className="cv-field"><span className="cv-label">Part répondue dans ce délai (%)</span><input className="cv-input" required type="number" min={0.1} max={100} step="0.1" value={sla.ratioPercent} onChange={e => setSla(s => ({ ...s, ratioPercent: e.target.value }))} /></label></div>
        <label><input type="checkbox" checked={sla.active} onChange={e => setSla(s => ({ ...s, active: e.target.checked }))} /> Politique active</label><div className="cv-toolbar"><button className="cv-button">Enregistrer l’objectif SLA</button><button className="cv-button cv-button-secondary" type="button" onClick={() => chooseSla(null)}>Nouvel objectif</button></div>
      </fieldset></form>{policy && <div className="cv-section"><DeleteReference key={policy.id} name={"SLA " + skillLabel(policy.skill)} busy={busy} onDelete={() => perform(async () => { await referenceAdmin.deleteSla(policy.id); chooseSla(null); setNotice("Politique supprimée."); })} /></div>}
    </section>
    <section className="cv-card cv-card-pad"><h2>Orientation par motif</h2><p className="cv-subtitle">La première règle active correspondant au motif choisit la file, avant le choix manuel initial. Le plus petit numéro de priorité gagne. Sans règle, la file choisie à l’accueil est conservée. Les règles aux conditions avancées ne sont pas exécutées.</p>
      <div className="cv-table-wrap cv-section"><table className="cv-table"><caption className="sr-only">Règles d’orientation</caption><thead><tr><th>Règle</th><th>Motif</th><th>File</th><th>Priorité</th><th>État</th><th>Action</th></tr></thead><tbody>{rules.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.intent ? intentLabel[item.intent] || item.intent : "Tous les motifs"}</td><td>{skillLabel(item.skill)}</td><td>{item.priority}</td><td>{!item.conditionsSupported ? "Conditions avancées : non exécutée" : item.active ? "Active" : "Inactive"}</td><td><button className="cv-button cv-button-secondary cv-button-small" disabled={busy || !item.conditionsSupported} onClick={() => chooseRoute(item)}>Modifier {item.name}</button></td></tr>)}</tbody></table></div>
      {!loading && !rules.length && <p className="cv-muted cv-section">Aucune règle : l’orientation choisie à l’accueil s’applique.</p>}
      <form className="cv-stack cv-section" onSubmit={e => { e.preventDefault(); void perform(async () => {
        const result = await referenceAdmin.saveRouting(rule?.id || null, { name: route.name, intent: route.intent || null, skill: route.skill, priority: Number(route.priority), active: route.active }); chooseRoute(result); setNotice("Règle d’orientation enregistrée.");
      }); }}><fieldset disabled={busy || loading || !options} className="cv-stack"><h3>{rule ? "Modifier la règle" : "Créer une règle"}</h3>
        <label className="cv-field"><span className="cv-label">Nom de la règle</span><input className="cv-input" required maxLength={80} value={route.name} onChange={e => setRoute(s => ({ ...s, name: e.target.value }))} /></label>
        <div className="cv-form-row"><label className="cv-field"><span className="cv-label">Motif à reconnaître</span><select className="cv-input" value={route.intent} onChange={e => setRoute(s => ({ ...s, intent: e.target.value }))}><option value="">Tous les motifs</option>{options?.intents.map(intent => <option key={intent} value={intent}>{intentLabel[intent] || intent}</option>)}</select></label>
          <label className="cv-field"><span className="cv-label">File de destination</span><select className="cv-input" required value={route.skill} onChange={e => setRoute(s => ({ ...s, skill: e.target.value }))}>{options?.skills.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}</select></label>
          <label className="cv-field"><span className="cv-label">Priorité (0 à 1 000 000)</span><input className="cv-input" required type="number" min={0} max={1000000} step={1} value={route.priority} onChange={e => setRoute(s => ({ ...s, priority: e.target.value }))} /></label></div>
        <label><input type="checkbox" checked={route.active} onChange={e => setRoute(s => ({ ...s, active: e.target.checked }))} /> Règle active</label><div className="cv-toolbar"><button className="cv-button">Enregistrer la règle</button><button className="cv-button cv-button-secondary" type="button" onClick={() => chooseRoute(null)}>Nouvelle règle</button></div>
      </fieldset></form>{rule && <div className="cv-section"><DeleteReference key={rule.id} name={rule.name} busy={busy} onDelete={() => perform(async () => { await referenceAdmin.deleteRouting(rule.id); chooseRoute(null); setNotice("Règle supprimée."); })} /></div>}
    </section></div>;
}
