"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { clearSession, sessionNotice } from "@/lib/auth";
import { roleHome, type Role } from "@/lib/contracts";
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  User,
  Headphones,
  Activity,
  Settings,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import Brand from "@/components/Brand";
import BackendHealth from "@/components/BackendHealth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      sessionStorage.setItem("jwt", data.token);
      sessionStorage.setItem("expiresAt", data.expiresAt);
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
    await performLogin(email, password);
  }

  const accounts = [
    {
      role: "Client",
      email: "customer@callverse.local",
      icon: User,
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
      role: "Admin",
      email: "admin@callverse.local",
      icon: Settings,
      desc: "Gérer les utilisateurs",
    },
  ];
  return (
    <main className="cv-login">
      <section className="cv-login-story">
        <Brand dark />
        <div className="cv-login-story-content">
          <p className="cv-eyebrow">CHAQUE ÉCHANGE COMPTE.</p>
          <h1>
            La relation client,
            <br />
            avec plus de
            <br />
            <em>clarté.</em>
          </h1>
          <p>
            Conversations, contexte et collaboration.
            <br />
            Tout se retrouve au même endroit.
          </p>
          <div className="cv-login-illustration" aria-hidden="true">
            <div className="cv-preview-label">
              <span className="cv-status-dot" />
              UN ÉCHANGE, UN LIEN
            </div>
            <div className="cv-login-note">
              <span className="cv-avatar">CL</span>
              <div>
                <span>Client</span>
                <p>Bonjour, j’ai une question sur ma carte.</p>
              </div>
            </div>
            <div className="cv-login-note cv-login-note-own">
              <div>
                <span>Conseiller</span>
                <p>Bonjour ! Regardons cela ensemble.</p>
              </div>
              <span className="cv-avatar">CV</span>
            </div>
            <div className="cv-login-note-footer">
              <ShieldCheck size={13} />
              Le contexte. La réponse. La confiance.
            </div>
          </div>
        </div>
        <div className="cv-login-story-bottom">
          <span>CallVerse · Relation client bancaire</span>
          <span>Simple. Ensemble.</span>
        </div>
      </section>
      <section className="cv-login-form-side">
        <Link href="/" className="cv-back-link">
          <ArrowLeft size={15} />
          Retour à l’accueil
        </Link>
        <div className="cv-login-form-container">
          <p className="cv-eyebrow">VOTRE ESPACE VOUS ATTEND</p>
          <h2>Ravi de vous retrouver.</h2>
          <p className="cv-subtitle">
            Connectez-vous avec le compte fourni par votre administrateur.
          </p>
          <form onSubmit={handleSubmit} className="cv-login-form">
            <label className="cv-field">
              <span className="cv-label">Adresse email</span>
              <div className="cv-input-icon">
                <Mail size={17} />
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@banque.com"
                  className="cv-input"
                />
              </div>
            </label>
            <label className="cv-field">
              <span className="cv-label">Mot de passe</span>
              <div className="cv-input-icon">
                <Lock size={17} />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="cv-input"
                />
              </div>
            </label>
            <div role="status">
              {notice && <p className="cv-notice mb-4">{notice}</p>}
            </div>
            {error && (
              <p role="alert" className="cv-error mb-4">
                {error}
              </p>
            )}
            <button disabled={loading} className="cv-button w-full !py-3.5">
              {loading ? "Connexion en cours…" : "Se connecter"}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="cv-demo-heading">
            <span>EXPLORER LA DÉMONSTRATION</span>
          </div>
          <p className="cv-muted mb-4 !leading-relaxed">
            Choisissez un rôle pour découvrir son espace avec les comptes de
            démonstration.
          </p>
          <div className="cv-demo-grid">
            {accounts.map((account) => (
              <button
                key={account.role}
                disabled={loading}
                onClick={() => performLogin(account.email, "Admin111***")}
                className="cv-demo-account"
              >
                <account.icon size={19} />
                <div>
                  <strong>{account.role}</strong>
                  <small>{account.desc}</small>
                </div>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
          <div className="cv-login-service">
            <BackendHealth />
          </div>
        </div>
        <p className="cv-login-legal">
          <ShieldCheck size={13} />
          L’accès et les fonctionnalités dépendent de votre rôle.
        </p>
      </section>
    </main>
  );
}
