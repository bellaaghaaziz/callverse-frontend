"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { clearSession, storeSession, sessionNotice } from "@/lib/auth";
import { roleHome, type Role } from "@/lib/contracts";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Headphones,
  Activity,
  Settings,
  ShieldCheck,
} from "lucide-react";
import BackendHealth from "@/components/BackendHealth";
import LoginStory from "@/components/login/LoginStory";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  // Read in an effect, not useSearchParams, so /login stays statically prerendered.
  // Drop the query afterwards so Back or a reload doesn't show the notice again.
  useEffect(() => {
    const message = sessionNotice(window.location.search);
    if (!message) return;
    setNotice(message);
    window.history.replaceState(null, "", "/login");
  }, []);

  async function performLogin(targetEmail: string, targetPass: string) {
    setNotice(null);
    setError(null);
    setLoading(true);
    try {
      clearSession();
      const data = await api.login(targetEmail, targetPass);
      storeSession(data);
      const user = await api.me();
      const home = roleHome[user.role as Role];
      if (!home) throw new Error("Unknown role");
      sessionStorage.setItem("user", JSON.stringify(user));
      document.cookie =
        "role=" +
        user.role +
        "; path=/; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
      router.push(home);
    } catch (error) {
      clearSession();
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Hide the password again before the submit goes on, so password managers see a password field.
    flushSync(() => setShowPassword(false));
    await performLogin(email, password);
  }

  const accounts = [
    {
      role: "Client",
      email: "customer@callverse.local",
      icon: MessageSquare,
      desc: "Retrouver votre échange",
    },
    {
      role: "Conseiller",
      email: "advisor@callverse.local",
      icon: Headphones,
      desc: "Accompagner vos clients",
    },
    {
      role: "Superviseur",
      email: "supervisor@callverse.local",
      icon: Activity,
      desc: "Suivre l’activité en direct",
    },
    {
      role: "Administrateur",
      email: "admin@callverse.local",
      icon: Settings,
      desc: "Gérer les utilisateurs",
    },
  ];
  return (
    <main className="cv-login">
      <LoginStory />
      <section className="cv-login-form-side">
        <Link href="/" className="cv-login-back">
          <ArrowLeft size={20} />
          Retour à l’accueil
        </Link>
        <div className="cv-login-form-container">
          <p className="cv-login-eyebrow">VOTRE ESPACE VOUS ATTEND</p>
          <h1>Ravi de vous retrouver.</h1>
          <p className="cv-login-intro">
            Connectez-vous avec le compte fourni par votre administrateur.
          </p>
          <p className="cv-subtitle"><Link href="/register">Créer mon espace client</Link></p>
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
          <h2 className="cv-login-demo-heading">EXPLORER LA DÉMONSTRATION</h2>
          <p className="cv-login-demo-text">
            Choisissez un rôle pour découvrir son espace avec les comptes de
            démonstration.
          </p>
          <div className="cv-login-accounts">
            {accounts.map((account) => (
              <button
                key={account.role}
                disabled={loading}
                onClick={() => performLogin(account.email, "Admin111***")}
                className="cv-login-account"
              >
                <span className="cv-login-account-icon">
                  <account.icon size={25} />
                </span>
                <span className="cv-login-account-text">
                  <strong>{account.role}</strong>
                  <small>{account.desc}</small>
                </span>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
          <div className="cv-login-service">
            <BackendHealth />
          </div>
        </div>
        <p className="cv-login-legal">
          <ShieldCheck size={18} />
          L’accès et les fonctionnalités dépendent de votre rôle.
        </p>
      </section>
    </main>
  );
}
