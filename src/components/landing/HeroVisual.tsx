import {
  BookOpen,
  Check,
  Headphones,
  CheckCheck,
  Activity,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  Send,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

// Illustrative app preview for the landing hero: decorative, hidden from
// assistive technology; the disclaimer below it stays readable.
const menu = [
  { icon: MessageSquare, label: "Conversations" },
  { icon: Users, label: "Clients" },
  { icon: Headphones, label: "Équipe" },
  { icon: BookOpen, label: "Connaissances" },
  { icon: Activity, label: "Statistiques" },
  { icon: Settings, label: "Paramètres" },
];

function Bars() {
  return (
    <span className="cv-lp-bars">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export default function HeroVisual() {
  return (
    <div className="cv-hero-visual">
      <div className="cv-hero-art" aria-hidden="true">
        <span className="cv-hero-sphere" />
        <svg
          className="cv-hero-swoosh"
          viewBox="0 0 640 560"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cv-swoosh" x1="0" y1="1" x2="1" y2="0">
              <stop
                offset="0"
                style={{ stopColor: "var(--lp-accent)" }}
                stopOpacity="0"
              />
              <stop
                offset="0.5"
                style={{ stopColor: "var(--lp-accent)" }}
                stopOpacity="0.55"
              />
              <stop
                offset="1"
                style={{ stopColor: "var(--lp-mint-strong)" }}
                stopOpacity="0.9"
              />
            </linearGradient>
          </defs>
          <path d="M40 540 C 260 470, 470 330, 630 40" />
          <path d="M150 556 C 360 500, 540 380, 640 170" />
        </svg>
      </div>
      <div className="cv-hero-stage" aria-hidden="true">
        <div className="cv-glass-card cv-glass-queue">
          <span className="cv-glass-icon">
            <Bars />
          </span>
          <span>
            <small>Simulation · File CARTES</small>
            <strong>3 en attente</strong>
          </span>
        </div>
        <div className="cv-glass-card cv-glass-resolved">
          <span className="cv-glass-check">
            <Check size={16} strokeWidth={3} />
          </span>
          <span>
            <small>Conversation résolue</small>
            <strong>2 min 41</strong>
          </span>
        </div>
        <div className="cv-product-preview">
          <div className="cv-preview-top">
            <span className="cv-preview-title">
              <Bars />
              Espace conseiller
            </span>
            <span className="cv-preview-status">
              <span className="cv-preview-online">
                <i />
                En ligne
              </span>
              <span className="cv-preview-user">
                <UserRound size={14} />
              </span>
            </span>
          </div>
          <div className="cv-preview-body">
            <ul className="cv-preview-menu">
              {menu.map((item, index) => (
                <li
                  key={item.label}
                  className={index === 0 ? "cv-preview-menu-active" : ""}
                >
                  <item.icon size={13} />
                  {item.label}
                </li>
              ))}
            </ul>
            <div className="cv-preview-chat">
              <div className="cv-preview-chat-header">
                <span className="cv-preview-avatar">ML</span>
                <span className="cv-preview-person">
                  <strong>Marie Laurent</strong>
                  <small>Client depuis 3 ans · Carte bancaire</small>
                </span>
                <span className="cv-preview-tools">
                  <Phone size={12} />
                  <Mail size={12} />
                  <MoreHorizontal size={12} />
                </span>
              </div>
              <div className="cv-preview-messages">
                <p className="cv-preview-bubble">
                  Bonjour, je n’arrive pas à accéder à mes dernières opérations
                  sur l’application. Pouvez-vous m’aider ?<small>10:24</small>
                </p>
                <p className="cv-preview-bubble cv-preview-bubble-own">
                  Bonjour Madame Laurent, je vérifie votre dossier. Pouvez-vous
                  me confirmer les 4 derniers chiffres de votre carte ?
                  <small>
                    10:27 <CheckCheck size={11} />
                  </small>
                </p>
                <p className="cv-preview-bubble">
                  Oui, c’est 4587. Merci beaucoup !<small>10:28</small>
                </p>
              </div>
              <div className="cv-preview-compose">
                <span>Écrivez votre message…</span>
                <Paperclip size={13} />
                <span className="cv-preview-send">
                  <Send size={12} />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="cv-glass-card cv-glass-clear">
          <span className="cv-glass-check cv-glass-check-soft">
            <Check size={18} strokeWidth={2.5} />
          </span>
          <span>
            <strong>Une conversation claire</strong>
            <small>Un accompagnement qui avance.</small>
          </span>
        </div>
      </div>
      <p className="cv-preview-disclaimer">
        Aperçu illustratif · Les données de cet exemple sont fictives.
      </p>
    </div>
  );
}
