"use client";
import { useState } from "react";
import Link from "next/link";
import { apiFetch, errorMessage } from "@/lib/api";
import LoginStory from "@/components/login/LoginStory";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", region: "", phone: "" });
  const [busy, setBusy] = useState(false), [created, setCreated] = useState(false), [error, setError] = useState("");
  return <main className="cv-login"><LoginStory /><section className="cv-login-form-side">
    <Link href="/login" className="cv-login-back">Retour à la connexion</Link>
    <div className="cv-login-form-container"><p className="cv-login-eyebrow">VOTRE ESPACE CLIENT</p><h1>Créer mon accès.</h1>
      <p className="cv-login-intro">Retrouvez vos échanges et suivez vos demandes auprès de la banque.</p>
      {created ? <div className="cv-notice" role="status"><p>Votre espace client est créé. Connectez-vous avec votre adresse e-mail et le mot de passe choisi.</p><Link className="cv-button cv-section" href="/login">Me connecter</Link></div> : <form className="cv-login-form" onSubmit={async e => {
        e.preventDefault(); if (busy) return; setBusy(true); setError("");
        try { await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ ...form, email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), region: form.region.trim(), phone: form.phone.trim() || null }) }); setCreated(true); setForm(s => ({ ...s, password: "" })); }
        catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
      }}><fieldset className="cv-stack" disabled={busy}>
        {([ ["firstName", "Prénom", "given-name", 80], ["lastName", "Nom", "family-name", 80], ["email", "Adresse e-mail", "email", 180], ["region", "Région", "address-level1", 40], ["phone", "Téléphone — facultatif", "tel", 30] ] as const).map(([key, label, autocomplete, max]) => <label key={key} className="cv-label">{label}<input className="cv-input" required={key !== "phone"} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} autoComplete={autocomplete} maxLength={max} value={form[key]} onChange={e => setForm(s => ({ ...s, [key]: e.target.value }))} /></label>)}
        <label className="cv-label">Mot de passe<input className="cv-input" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={form.password} onChange={e => setForm(s => ({ ...s, password: e.target.value }))} /></label>
        <p className="cv-muted">12 caractères minimum, 72 octets maximum ; évitez le nom de votre adresse e-mail.</p>
        {error && <p role="alert" className="cv-error">{error}</p>}
        <button className="cv-login-submit">{busy ? "Création en cours…" : "Créer mon espace client"}</button>
      </fieldset></form>}
    </div></section></main>;
}
