"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, apiFetch, errorMessage } from "@/lib/api";
import { clearSession, storeSession, sessionNotice } from "@/lib/auth";
import { roleHome, type Customer, type Role } from "@/lib/contracts";
import { signOutNotice } from "@/lib/customer";
import { Lock, Mail, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import BackendHealth from "@/components/BackendHealth";
import LoginStory from "@/components/login/LoginStory";

// Where each role lands, in the words shown while its space opens.
const spaceName: Record<Role, string> = {
  CUSTOMER: "votre espace client",
  ADVISOR: "votre poste conseiller",
  SUPERVISOR: "votre tableau de supervision",
  ADMIN: "votre espace d’administration",
};
const WELCOME_DELAY_MS = 1200;

function Check() {
  return <span className="cv-login-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [farewell, setFarewell] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<{ name: string; space: string } | null>(null);
  const router = useRouter();

  // Read in an effect, not useSearchParams, so /login stays statically prerendered.
  // Drop the query afterwards so Back or a reload doesn't show the notice again.
  useEffect(() => {
    const search = window.location.search;
    const expired = sessionNotice(search);
    const signedOut = signOutNotice(search);
    if (!expired && !signedOut) return;
    setNotice(expired);
    setFarewell(signedOut);
    window.history.replaceState(null, "", "/login");
  }, []);

  async function performLogin(targetEmail: string, targetPass: string) {
    setNotice(null);
    setFarewell(null);
    setError(null);
    setLoading(true);
    try {
      clearSession();
      const data = await api.login(targetEmail, targetPass);
      storeSession(data);
      const user = await api.me();
      const role = user.role as Role;
      const home = roleHome[role];
      if (!home) throw new Error("Unknown role");
      sessionStorage.setItem("user", JSON.stringify(user));
      document.cookie =
        "role=" +
        user.role +
        "; path=/; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
      // A customer is greeted by name; staff by the space that opens.
      let name = "";
      if (role === "CUSTOMER") {
        try { name = (await apiFetch<Customer>("/me/customer")).firstName; } catch { /* Greet without the name. */ }
      }
      router.prefetch(home);
      setWelcome({ name, space: spaceName[role] });
      setTimeout(() => router.push(home), WELCOME_DELAY_MS);
    } catch (error) {
      clearSession();
      setError(errorMessage(error));
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Hide the password again before the submit goes on, so password managers see a password field.
    flushSync(() => setShowPassword(false));
    await performLogin(email, password);
  }

  return (
    <main className="cv-login">
      <LoginStory />
      <section className="cv-login-form-side">
        <Link href="/" className="cv-login-back">
          <ArrowLeft size={20} />
          Retour à l’accueil
        </Link>
        <div className="cv-login-form-container">
          {welcome ? (
            <div className="cv-login-success" role="status">
              <Check />
              <h2>Connexion réussie</h2>
              <p>{welcome.name ? `Bienvenue, ${welcome.name}. ` : "Bienvenue. "}Ouverture de {welcome.space}…</p>
              <span className="cv-login-progress" aria-hidden="true"><span /></span>
            </div>
          ) : (
            <>
              <p className="cv-login-eyebrow">VOTRE ESPACE VOUS ATTEND</p>
              <h1>Ravi de vous retrouver.</h1>
              <p className="cv-login-intro">
                Connectez-vous avec votre adresse e-mail et votre mot de passe.
              </p>
              <p className="cv-subtitle"><Link href="/register">Créer mon espace client</Link></p>
              <div role="status">
                {farewell && <p className="cv-login-farewell"><Check />{farewell}</p>}
              </div>
              <form onSubmit={handleSubmit} className="cv-login-form">
                <div className="cv-login-field">
                  <label className="cv-login-label" htmlFor="login-email">
                    Adresse e-mail
                  </label>
                  <div className="cv-login-control">
                    <Mail className="cv-login-field-icon" size={22} />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@banque.com"
                      className="cv-login-input"
                    />
                  </div>
                </div>
                <div className="cv-login-field">
                  <label className="cv-login-label" htmlFor="login-password">
                    Mot de passe
                  </label>
                  <div className="cv-login-control">
                    <Lock className="cv-login-field-icon" size={22} />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="cv-login-input"
                    />
                    {/* One fixed name; the state is aria-pressed (WAI-ARIA toggle button). */}
                    <button
                      type="button"
                      className="cv-login-toggle"
                      aria-label="Afficher le mot de passe"
                      aria-pressed={showPassword}
                      aria-controls="login-password"
                      onClick={() => setShowPassword((shown) => !shown)}
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>
                <div role="status">
                  {notice && <p className="cv-notice mb-4">{notice}</p>}
                </div>
                {error && (
                  <p role="alert" className="cv-error mb-4">
                    {error}
                  </p>
                )}
                <button disabled={loading} className="cv-login-submit">
                  {loading ? "Connexion en cours…" : "Se connecter"}
                  <ArrowRight size={21} />
                </button>
              </form>
              <div className="cv-login-service">
                <BackendHealth />
              </div>
            </>
          )}
        </div>
        <p className="cv-login-legal">
          <ShieldCheck size={18} />
          L’accès et les fonctionnalités dépendent de votre rôle.
        </p>
      </section>
    </main>
  );
}
