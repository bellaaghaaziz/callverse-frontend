import Link from "next/link";
import Brand from "@/components/Brand";
import HeroVisual from "@/components/landing/HeroVisual";
import LandingNav from "@/components/landing/LandingNav";
import { CtaArt, FeatureArt } from "@/components/landing/Illustrations";
import {
  ArrowUpRight,
  ArrowRight,
  MessageSquare,
  Headphones,
  Activity,
  Users,
  BookOpen,
  Settings,
  Server,
  Database,
  Radio,
  Sparkles,
  Monitor,
} from "lucide-react";

const features = [
  {
    kind: "chat" as const,
    label: "01 · ÉCHANGER",
    icon: MessageSquare,
    title: (
      <>
        Des conversations
        <br />
        qui restent lisibles.
      </>
    ),
    text: "Messages en direct, intervenants identifiés, horaires et historique. Gardez le fil de chaque échange.",
  },
  {
    kind: "context" as const,
    label: "02 · COMPRENDRE",
    icon: BookOpen,
    title: (
      <>
        Le contexte change
        <br />
        tout.
      </>
    ),
    text: "Consultez le dossier client, les opérations récentes et les procédures utiles depuis le poste conseiller.",
  },
  {
    kind: "team" as const,
    label: "03 · AVANCER",
    icon: Activity,
    title: (
      <>
        Les équipes,
        <br />
        connectées.
      </>
    ),
    text: "Orientez les contacts, ouvrez un ticket et sollicitez le superviseur quand la situation le demande.",
  },
];

const roles = [
  {
    icon: MessageSquare,
    title: "Client",
    desc: "Retrouvez votre échange et discutez directement avec votre conseiller.",
    n: "01",
  },
  {
    icon: Headphones,
    title: "Conseiller",
    desc: "Prenez en charge les contacts avec le dossier client et les actions utiles.",
    n: "02",
  },
  {
    icon: Users,
    title: "Superviseur",
    desc: "Suivez les files, les indicateurs du jour et les alertes de votre session.",
    n: "03",
  },
  {
    icon: Settings,
    title: "Administrateur",
    desc: "Gérez les comptes, les rôles et les accès de votre plateforme.",
    n: "04",
  },
];

// Only what the project really uses; the AI service is not wired yet.
const stack = [
  { icon: Monitor, title: "Next.js", desc: "Interface web" },
  { icon: Server, title: "Spring Boot", desc: "API et règles métier" },
  { icon: Radio, title: "STOMP / WebSocket", desc: "Échanges en direct" },
  { icon: Database, title: "PostgreSQL", desc: "Données et historique" },
  { icon: Sparkles, title: "Service IA", desc: "Bientôt disponible" },
];

export default function Home() {
  return (
    <div className="cv-landing">
      <header className="cv-landing-nav">
        <Brand />
        <LandingNav />
        <Link href="/login" className="cv-button">
          Se connecter
          <ArrowUpRight size={15} />
        </Link>
      </header>
      <main>
        <section className="cv-hero">
          <div className="cv-hero-copy">
            <p className="cv-eyebrow">
              <span className="cv-status-dot" />
              LA RELATION CLIENT, RÉINVENTÉE
            </p>
            <h1>
              Plus proches.
              <br />
              Plus clairs.
              <br />
              <em>Ensemble.</em>
            </h1>
            <p className="cv-hero-description">
              Le bon échange commence avec les bonnes informations. Réunissez
              vos conversations, vos équipes et le contexte client dans un
              espace qui fait sens.
            </p>
            <div className="cv-hero-actions">
              <Link href="/login" className="cv-button">
                Découvrir mon espace
                <ArrowUpRight size={17} />
              </Link>
              <a href="#experience" className="cv-hero-more">
                Voir l’expérience
                <ArrowRight size={17} />
              </a>
            </div>
            <div className="cv-hero-footnote">
              <span className="cv-hero-avatars" aria-hidden="true">
                <i>CL</i>
                <i>CV</i>
                <i>SV</i>
              </span>
              <span>
                Un lien entre clients,
                <br />
                conseillers et équipes.
              </span>
            </div>
          </div>
          <HeroVisual />
        </section>
        <section className="cv-experience" id="experience">
          <div className="cv-section-intro">
            <div>
              <p className="cv-eyebrow">
                MOINS DE DISPERSION, PLUS DE RELATION.
              </p>
              <h2>
                Tout ce qui aide.
                <br />
                Là où vous en avez
                <br />
                <em>besoin.</em>
              </h2>
            </div>
            <p>
              Un outil pensé pour comprendre la demande, retrouver le contexte
              et faire avancer la conversation.
            </p>
          </div>
          <div className="cv-feature-grid">
            {features.map((feature) => (
              <article key={feature.label} className="cv-feature-card">
                <FeatureArt kind={feature.kind} />
                <span className="cv-feature-number">{feature.label}</span>
                <span className="cv-feature-symbol">
                  <feature.icon size={24} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <ArrowUpRight className="cv-feature-arrow" size={18} />
              </article>
            ))}
          </div>
        </section>
        <section className="cv-roles-section" id="roles">
          <div className="cv-section-intro">
            <div>
              <p className="cv-eyebrow">À CHACUN SON ESPACE</p>
              <h2>
                Une plateforme.
                <br />
                Quatre façons de se
                <br />
                retrouver.
              </h2>
            </div>
            <p className="cv-section-intro-lined">
              Chaque rôle dispose d’un espace dédié, conçu pour ses besoins,
              avec les bons outils et la bonne information.
            </p>
          </div>
          <div className="cv-role-grid">
            {roles.map((role) => (
              <Link href="/login" key={role.n} className="cv-role-card">
                <span className="cv-role-card-top">
                  <span className="cv-role-icon">
                    <role.icon size={20} />
                  </span>
                  <span>{role.n}</span>
                </span>
                <h3>{role.title}</h3>
                <p>{role.desc}</p>
                <span className="cv-role-card-link">
                  Découvrir l’espace
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="cv-architecture" id="architecture">
          <div className="cv-architecture-intro">
            <p className="cv-eyebrow">ARCHITECTURE</p>
            <h2>Une base simple et solide.</h2>
          </div>
          <ul className="cv-architecture-list">
            {stack.map((item) => (
              <li key={item.title}>
                <item.icon size={18} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="cv-landing-cta">
          <CtaArt />
          <div>
            <p className="cv-eyebrow">CHAQUE ÉCHANGE COMPTE.</p>
            <h2>
              La prochaine conversation
              <br />
              commence ici.
            </h2>
          </div>
          <Link href="/login" className="cv-button">
            Entrer dans mon espace
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="cv-landing-footer">
        <Brand />
        <p>La relation client, avec plus de clarté.</p>
        <nav aria-label="Liens du pied de page">
          <a href="#experience">L’expérience</a>
          <a href="#roles">Vos espaces</a>
          <a href="#architecture">Architecture</a>
        </nav>
      </footer>
    </div>
  );
}
