import Link from "next/link";
import Brand from "@/components/Brand";
import {
  ArrowUpRight,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Headphones,
  Activity,
  Users,
  Check,
  BookOpen,
  Send,
  ChevronRight,
} from "lucide-react";
export default function Home() {
  return (
    <div className="cv-landing">
      <header className="cv-landing-nav">
        <Brand />
        <nav aria-label="Navigation du site">
          <a href="#experience">L’expérience</a>
          <a href="#roles">Vos espaces</a>
        </nav>
        <Link href="/login" className="cv-button cv-button-secondary">
          Se connecter
          <ArrowUpRight size={14} />
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
                <ArrowUpRight size={16} />
              </Link>
              <a href="#experience" className="cv-hero-more">
                Voir l’expérience
                <ArrowRight size={15} />
              </a>
            </div>
            <div className="cv-hero-footnote">
              <span className="cv-hero-avatars">
                <i>CL</i>
                <i>CV</i>
                <i>SV</i>
              </span>
              <span>
                Un lien entre clients,
                <br />
                <strong>conseillers et équipes.</strong>
              </span>
            </div>
          </div>
          <div className="cv-hero-visual">
            <div className="cv-visual-grid" aria-hidden="true" />
            <span className="cv-visual-caption">L’ESPACE QUI RELIE.</span>
            <div
              className="cv-product-preview"
              aria-label="Aperçu illustratif d’une conversation"
            >
              <div className="cv-preview-top">
                <span className="flex items-center gap-2">
                  <span className="cv-preview-logo">
                    <Headphones size={15} />
                  </span>
                  Votre espace de travail
                </span>
                <span>Aperçu</span>
              </div>
              <div className="cv-preview-body">
                <div className="cv-preview-sidebar">
                  <MessageSquare size={18} />
                  <Users size={17} />
                  <BookOpen size={17} />
                  <Activity size={17} />
                  <span className="cv-avatar">CV</span>
                </div>
                <div className="cv-preview-chat">
                  <div className="cv-preview-chat-header">
                    <span className="cv-avatar cv-avatar-light">ML</span>
                    <div>
                      <strong>Marie Laurent</strong>
                      <p>Une question sur votre carte</p>
                    </div>
                    <span className="cv-preview-live" />
                  </div>
                  <p className="cv-preview-day">Aujourd’hui</p>
                  <div className="cv-preview-bubble">
                    Bonjour, je souhaite vérifier une opération sur ma carte.
                    <small>10:42</small>
                  </div>
                  <div className="cv-preview-bubble cv-preview-bubble-own">
                    Bonjour Marie, je suis là pour vous aider. Regardons cela
                    ensemble.
                    <small>
                      10:43 <Check size={10} />
                    </small>
                  </div>
                  <div className="cv-preview-context">
                    <ShieldCheck size={13} />
                    <span>Le dossier client, à portée de main.</span>
                  </div>
                  <div className="cv-preview-compose">
                    <span>Écrire un message…</span>
                    <span>
                      <Send size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="cv-floating-card">
              <span>
                <Check size={18} />
              </span>
              <div>
                <strong>Une conversation claire.</strong>
                <p>Un accompagnement qui avance.</p>
              </div>
            </div>
            <p className="cv-preview-disclaimer">
              Aperçu illustratif · les données de cet exemple sont fictives.
            </p>
          </div>
        </section>
        <div className="cv-value-strip">
          <span>
            <MessageSquare size={17} />
            Des échanges en direct
          </span>
          <span>
            <Users size={17} />
            Un contexte partagé
          </span>
          <span>
            <ShieldCheck size={17} />
            Des accès par rôle
          </span>
          <span>
            <Activity size={17} />
            Une activité visible
          </span>
        </div>
        <section className="cv-experience" id="experience">
          <div className="cv-section-intro">
            <p className="cv-eyebrow">MOINS DE DISPERSION. PLUS DE RELATION.</p>
            <h2>
              Tout ce qui aide.
              <br />
              Là où vous en avez besoin.
            </h2>
            <p>
              Un outil pensé pour comprendre la demande, retrouver le contexte
              et faire avancer la conversation.
            </p>
          </div>
          <div className="cv-feature-grid">
            <article className="cv-feature-card cv-feature-main">
              <span className="cv-feature-number">01 / ÉCHANGER</span>
              <div className="cv-feature-mini-chat">
                <span>Bonjour, pouvez-vous m’aider ?</span>
                <span>Bien sûr. On regarde ensemble.</span>
                <span className="cv-feature-typing">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <h3>
                Des conversations
                <br />
                qui restent lisibles.
              </h3>
              <p>
                Messages en direct, intervenants identifiés, horaires et
                historique. Gardez le fil de chaque échange.
              </p>
              <MessageSquare size={20} />
            </article>
            <article className="cv-feature-card">
              <span className="cv-feature-number">02 / COMPRENDRE</span>
              <div className="cv-feature-symbol">
                <BookOpen size={36} />
              </div>
              <h3>Le contexte change tout.</h3>
              <p>
                Consultez le dossier client, les opérations récentes et les
                procédures utiles depuis le poste conseiller.
              </p>
              <BookOpen size={20} />
            </article>
            <article className="cv-feature-card">
              <span className="cv-feature-number">03 / AVANCER</span>
              <div className="cv-feature-symbol">
                <Activity size={36} />
              </div>
              <h3>Les équipes, connectées.</h3>
              <p>
                Orientez les contacts, ouvrez un ticket et sollicitez le
                superviseur quand la situation le demande.
              </p>
              <ArrowUpRight size={20} />
            </article>
          </div>
        </section>
        <section className="cv-roles-section" id="roles">
          <div className="cv-section-intro">
            <p className="cv-eyebrow">À CHACUN SON ESPACE</p>
            <h2>
              Une plateforme.
              <br />
              Quatre façons de se retrouver.
            </h2>
          </div>
          <div className="cv-role-grid">
            {[
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
                icon: Activity,
                title: "Superviseur",
                desc: "Suivez les files, les indicateurs du jour et les alertes de votre session.",
                n: "03",
              },
              {
                icon: Users,
                title: "Administrateur",
                desc: "Gérez les comptes, les rôles et les accès de votre plateforme.",
                n: "04",
              },
            ].map((role) => (
              <Link href="/login" key={role.n} className="cv-role-card">
                <span className="cv-role-card-top">
                  <role.icon size={22} />
                  <span>{role.n}</span>
                </span>
                <h3>{role.title}</h3>
                <p>{role.desc}</p>
                <span className="cv-role-card-link">
                  Découvrir l’espace
                  <ChevronRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="cv-landing-cta">
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
            <ArrowUpRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="cv-landing-footer">
        <Brand />
        <p>La relation client, avec plus de clarté.</p>
        <span>CallVerse · Relation client bancaire</span>
      </footer>
    </div>
  );
}
