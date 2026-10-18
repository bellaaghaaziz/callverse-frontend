"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch, errorMessage } from "@/lib/api";

type AdvisorUser = { id: string; firstName: string; lastName: string; email: string };
type Profile = { id: string; userId: string; displayName: string; status: string; maxConcurrent: number; creditLimit: number; skills: Record<string, number> };
const skills = { ACCOUNTS: "Comptes", CARDS: "Cartes", CREDIT: "Crédit", FRAUD: "Fraude" };

export default function AdminAdvisorProfiles() {
  const [users, setUsers] = useState<AdvisorUser[]>([]);
  const [selected, setSelected] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState("OFFLINE");
  const [capacity, setCapacity] = useState(1);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<{ content: AdvisorUser[] }>("/admin/users?role=ADVISOR&size=100")
      .then(data => { if (active) { setUsers(data.content); setSelected(data.content[0]?.id ?? ""); } })
      .catch(e => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true); setProfileReady(false); setError(""); setNotice(""); setProfile(null);
    apiFetch<Profile>(`/admin/users/${selected}/advisor-profile`)
      .then(data => { if (active) { setProfile(data); setStatus(data.status); setCapacity(data.maxConcurrent); setLevels(data.skills); setProfileReady(true); } })
      .catch(e => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) { setStatus("OFFLINE"); setCapacity(1); setLevels({}); setProfileReady(true); }
        else setError(errorMessage(e));
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, revision]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy || !selected || !profileReady) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await apiFetch<Profile>(`/admin/users/${selected}/advisor-profile`, {
        method: "PUT", body: JSON.stringify({ status, maxConcurrent: capacity, skills: levels }),
      });
      setProfile(saved); setNotice("Le profil conseiller a été enregistré. Les compétences choisies sont effectives.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return <section className="cv-card cv-card-pad cv-section" aria-busy={loading || busy}>
    <h2 className="cv-tool-title">Compétences et disponibilité des conseillers</h2>
    <p className="cv-subtitle">Choisissez les compétences autorisées et la capacité de chaque conseiller.</p>
    {error && <p className="cv-error" role="alert">{error}</p>}
    {notice && <p className="cv-notice" role="status">{notice}</p>}
    {!loading && !users.length && <p className="cv-empty">Créez un compte avec le rôle Conseiller dans l’onglet Utilisateurs.</p>}
    {users.length > 0 && <form onSubmit={save}>
      <label className="cv-field">Conseiller<select className="cv-input" value={selected} disabled={busy} onChange={e => setSelected(e.target.value)}>
        {users.map(user => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} — {user.email}</option>)}
      </select></label>
      <button type="button" className="cv-button cv-button-secondary cv-section" disabled={busy || loading} onClick={() => setRevision(n => n + 1)}>Actualiser le profil</button>
      <fieldset disabled={busy || loading || !profileReady} className="cv-section">
        <div className="cv-two-columns">
          <label className="cv-field">Disponibilité<select className="cv-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="OFFLINE">Hors ligne</option><option value="AVAILABLE">Disponible</option>
            <option value="BUSY">Occupé</option><option value="BREAK">En pause</option>
          </select></label>
          <label className="cv-field">Conversations simultanées<input className="cv-input" type="number" min={1} max={10} required value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></label>
        </div>
        <fieldset className="cv-section"><legend>Compétences autorisées et niveau (1 à 3)</legend>
          {Object.entries(skills).map(([code, label]) => <div key={code} className="cv-section" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <label><input type="checkbox" checked={code in levels} onChange={e => setLevels(current => {
              const next = { ...current }; if (e.target.checked) next[code] = 1; else delete next[code]; return next;
            })} /> {label}</label>
            {code in levels && <select className="cv-input" style={{ width: "auto" }} aria-label={`Niveau ${label}`} value={levels[code]} onChange={e => setLevels(current => ({ ...current, [code]: Number(e.target.value) }))}>
              <option value={1}>Niveau 1</option><option value={2}>Niveau 2</option><option value={3}>Niveau 3</option>
            </select>}
          </div>)}
        </fieldset>
        <p className="cv-subtitle">Sans compétence sélectionnée, le conseiller ne peut prendre aucun contact. {profile && `Plafond de geste commercial : ${profile.creditLimit} €.`}</p>
        <button className="cv-button" type="submit">{busy ? "Enregistrement…" : "Enregistrer le profil conseiller"}</button>
      </fieldset>
    </form>}
  </section>;
}
