import {
  ChartNoAxesColumn,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Brand from "@/components/Brand";

// Login story panel (2026-10-11 mockup). Drawn on a 767-unit grid sized to the
// panel (--u = panel width / 767), so the mockup's pixels are its units. The
// art and the sample exchange are decorative and hidden from assistive
// technology; the headline and sub-copy stay readable.
export default function LoginStory() {
  return (
    <section className="cv-login-story">
      <div className="cv-login-art" aria-hidden="true">
        <span className="cv-login-glow" />
        <svg
          className="cv-login-lines"
          viewBox="0 0 767 1058"
          preserveAspectRatio="xMinYMin meet"
        >
          <defs>
            <linearGradient id="cv-login-swoosh" x1="0" y1="0" x2="1" y2="1">
              <stop
                offset="0"
                style={{ stopColor: "var(--lp-glow)" }}
                stopOpacity="0"
              />
              <stop
                offset="0.55"
                style={{ stopColor: "var(--lp-glow)" }}
                stopOpacity="0.5"
              />
              <stop
                offset="1"
                style={{ stopColor: "var(--lp-glow)" }}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            className="cv-login-swoosh"
            d="M520 -20 C 690 90, 720 260, 640 420 S 560 760, 790 900 S 1000 1000, 1200 960"
          />
          <path
            className="cv-login-swoosh cv-login-swoosh-thin"
            d="M600 -10 C 760 120, 770 300, 700 470 S 690 700, 800 760 S 1000 760, 1200 700"
          />
          <path
            className="cv-login-swoosh cv-login-swoosh-thin"
            d="M-20 1000 C 160 900, 360 960, 520 880 S 720 760, 790 640 S 1000 520, 1200 520"
          />
          <path
            className="cv-login-swoosh"
            d="M-30 1080 C 180 960, 420 1030, 600 950 S 760 860, 800 820 S 1000 700, 1200 690"
          />
          <path className="cv-login-thread" d="M726 0 V125" />
          <path className="cv-login-thread" d="M660 300 V365" />
          <path className="cv-login-thread" d="M553 350 V585" />
          <circle className="cv-login-node" cx="726" cy="125" r="4" />
          <circle className="cv-login-node" cx="660" cy="342" r="4" />
          <circle className="cv-login-node" cx="553" cy="493" r="4.5" />
        </svg>
        <span className="cv-login-tile cv-login-tile-chat">
          <MessageSquareText />
        </span>
        <span className="cv-login-tile cv-login-tile-chart">
          <ChartNoAxesColumn />
        </span>
        <span className="cv-login-tile cv-login-tile-person">
          <UserRound />
        </span>
      </div>
      <Brand dark link={false} />
      <p className="cv-login-eyebrow">
        <span className="cv-status-dot" />
        CHAQUE ÉCHANGE COMPTE.
      </p>
      <p className="cv-login-headline">
        La relation
        <br className="cv-login-break" /> client,
        <br />
        avec plus de
        <br />
        <em>clarté.</em>
      </p>
      <p className="cv-login-lead">
        Conversations, contexte et collaboration.
        <br />
        Tout se retrouve au même endroit.
      </p>
      <div className="cv-login-card" aria-hidden="true">
        <p className="cv-login-card-label">
          <span className="cv-status-dot" />
          UN ÉCHANGE, UN LIEN
        </p>
        <span className="cv-login-card-menu">
          <i />
          <i />
          <i />
        </span>
        <span className="cv-login-avatar cv-login-avatar-client">CL</span>
        <p className="cv-login-chat-label cv-login-chat-client">Client</p>
        <p className="cv-login-bubble">
          Bonjour, j’ai une question sur ma carte.
          <time>10:24</time>
        </p>
        <svg className="cv-login-connector" viewBox="0 0 630 330">
          <path d="M71 160 V194 Q71 226 103 226 H122" />
        </svg>
        <span className="cv-login-connector-dot" />
        <span className="cv-login-typing"><i /><i /><i /></span>
        <p className="cv-login-chat-label cv-login-chat-advisor">Conseiller</p>
        <p className="cv-login-bubble cv-login-bubble-own">
          Bonjour ! Regardons cela ensemble.
          <time>10:28</time>
        </p>
        <span className="cv-login-avatar cv-login-avatar-advisor">CV</span>
        <p className="cv-login-card-note">
          <ShieldCheck />
          Le contexte. La réponse. La confiance.
        </p>
      </div>
      <div className="cv-login-story-bottom">
        <span>CallVerse · Relation client bancaire</span>
        <span>Simple. Ensemble.</span>
      </div>
    </section>
  );
}
