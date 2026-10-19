"use client";
import { useId, useState } from "react";
import { CheckCircle2, Copy, KeyRound, UserPlus } from "lucide-react";
import { apiFetch, errorMessage } from "@/lib/api";
import { generatePassword, passwordProblem } from "@/lib/onboarding";

interface Onboarded { customerId: string; email: string; externalRef: string; maskedIban: string; cardLast4: string }
const SEGMENTS = [["MASS", "Particulier"], ["AFFLUENT", "Patrimonial"], ["PRIVATE", "Banque privée"], ["PROFESSIONAL", "Professionnel"]];
const PRODUCTS = [["CUR_ESSENTIAL", "Compte courant Essentiel"], ["CUR_PREMIUM", "Compte courant Premium"]];
const empty = { firstName: "", lastName: "", email: "", phone: "", region: "", segment: "MASS", productCode: "CUR_ESSENTIAL", initialDeposit: "", temporaryPassword: "" };
const random = (n: number) => crypto.getRandomValues(new Uint32Array(n + 1))[n];

// Opening a customer as a branch does: identity and contact, the offer, a temporary password
// handed over in person. One call creates the login, the profile, the account and the card.
export default function CustomerOnboarding() {
  const id = useId();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<(Onboarded & { name: string; password: string }) | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (key: keyof typeof empty) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(previous => ({ ...previous, [key]: event.target.value }));
  const problem = form.temporaryPassword ? passwordProblem(form.temporaryPassword, form.email) : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const invalid = passwordProblem(form.temporaryPassword, form.email);
    if (invalid) { setError("Mot de passe temporaire : " + invalid); return; }
    setBusy(true); setError("");
    try {
      const result = await apiFetch<Onboarded>("/customers", {
        method: "POST",
        body: JSON.stringify({ ...form, phone: form.phone || null, initialDeposit: form.initialDeposit ? Number(form.initialDeposit) : null }),
      });
      setCreated({ ...result, name: `${form.firstName} ${form.lastName}`, password: form.temporaryPassword });
      setForm(empty);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  if (created) return (
    <section className="cv-cs-card cv-onboard-done cv-cs-reveal" role="status">
      <span className="cv-onboard-check" aria-hidden="true"><CheckCircle2 size={34} /></span>
      <h2>Client ouvert : {created.name}</h2>
      <dl className="cv-onboard-summary">
        <div><dt>Numéro client</dt><dd>{created.externalRef}</dd></div>
        <div><dt>Identifiant de connexion</dt><dd>{created.email}</dd></div>
        <div><dt>Compte courant</dt><dd>{created.maskedIban}</dd></div>
        <div><dt>Carte de débit</dt><dd>VISA •••• {created.cardLast4}</dd></div>
      </dl>
      <div className="cv-onboard-password">
        <KeyRound size={18} aria-hidden="true" />
        <span>Mot de passe temporaire : <strong>{created.password}</strong></span>
        <button type="button" className="cv-button cv-button-secondary cv-button-small"
          onClick={() => { void navigator.clipboard?.writeText(created.password).then(() => setCopied(true)); }}>
          <Copy size={14} aria-hidden="true" />{copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="cv-muted">Remettez ce mot de passe au client en personne. Il ne sera plus affiché.</p>
      <button type="button" className="cv-button" onClick={() => { setCreated(null); setCopied(false); }}>
        <UserPlus size={16} aria-hidden="true" />Ouvrir un autre client
      </button>
    </section>
  );

  return (
    <section className="cv-cs-card cv-onboard" aria-labelledby={id + "-title"} data-tour="onboarding">
      <div className="cv-cs-card-head">
        <h2 id={id + "-title"}><UserPlus size={19} aria-hidden="true" /> Ouvrir un nouveau client</h2>
      </div>
      <p className="cv-muted">Le client reçoit un accès à son espace, un compte courant et une carte de débit.</p>
      <form onSubmit={submit} className="cv-onboard-form">
        <fieldset disabled={busy}>
          <legend>Identité et contact</legend>
          <div className="cv-form-row">
            <label className="cv-label">Prénom<input className="cv-input" required maxLength={80} autoComplete="off" value={form.firstName} onChange={set("firstName")} /></label>
            <label className="cv-label">Nom<input className="cv-input" required maxLength={80} autoComplete="off" value={form.lastName} onChange={set("lastName")} /></label>
          </div>
          <div className="cv-form-row">
            <label className="cv-label">Adresse e-mail<input className="cv-input" type="email" required maxLength={180} autoComplete="off" value={form.email} onChange={set("email")} /></label>
            <label className="cv-label">Téléphone (facultatif)<input className="cv-input" type="tel" maxLength={30} autoComplete="off" value={form.phone} onChange={set("phone")} /></label>
          </div>
          <label className="cv-label">Ville ou région<input className="cv-input" required maxLength={40} value={form.region} onChange={set("region")} /></label>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Offre</legend>
          <div className="cv-form-row">
            <label className="cv-label">Profil client<select className="cv-input" value={form.segment} onChange={set("segment")}>{SEGMENTS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <label className="cv-label">Compte à ouvrir<select className="cv-input" value={form.productCode} onChange={set("productCode")}>{PRODUCTS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          </div>
          <label className="cv-label">Versement à l’ouverture en euros (facultatif)<input className="cv-input" type="number" min="0" max="1000000" step="0.01" inputMode="decimal" value={form.initialDeposit} onChange={set("initialDeposit")} /></label>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Accès à l’espace client</legend>
          <div className="cv-onboard-password-field">
            <label className="cv-label">Mot de passe temporaire<input className="cv-input" required minLength={12} maxLength={72} autoComplete="new-password"
              aria-describedby={id + "-password-help"} value={form.temporaryPassword} onChange={set("temporaryPassword")} /></label>
            <button type="button" className="cv-button cv-button-secondary" onClick={() => setForm(f => ({ ...f, temporaryPassword: generatePassword(random) }))}>
              <KeyRound size={15} aria-hidden="true" />Générer
            </button>
          </div>
          <p id={id + "-password-help"} className={problem ? "cv-error" : "cv-muted"}>{problem || "12 caractères au moins, sans le début de l’adresse e-mail."}</p>
        </fieldset>
        {error && <p className="cv-error" role="alert">{error}</p>}
        <button className="cv-button">{busy ? "Ouverture en cours…" : "Ouvrir le client"}</button>
      </form>
    </section>
  );
}
