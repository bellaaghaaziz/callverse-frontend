import { UserRound, UsersRound } from "lucide-react";

// Decorative glass illustrations of the landing (CSS layers, no images).

export function FeatureArt({ kind }: { kind: "chat" | "context" | "team" }) {
  return (
    <div className={"cv-feature-art cv-feature-art-" + kind} aria-hidden="true">
      {kind === "chat" && (
        <>
          <span className="cv-glass-slab" />
          <span className="cv-glass-tile cv-glass-tile-chat">
            <i />
            <b />
            <b />
          </span>
        </>
      )}
      {kind === "context" && (
        <>
          <span className="cv-glass-sheet cv-glass-sheet-back" />
          <span className="cv-glass-sheet cv-glass-sheet-mid">
            <b />
            <b />
          </span>
          <span className="cv-glass-sheet cv-glass-sheet-front">
            <i />
            <b />
            <b />
          </span>
        </>
      )}
      {kind === "team" && (
        <>
          <span className="cv-glass-tile cv-glass-tile-a">
            <UserRound size={18} />
          </span>
          <span className="cv-glass-tile cv-glass-tile-b">
            <UsersRound size={18} />
          </span>
          <span className="cv-glass-tile cv-glass-tile-c">
            <UserRound size={22} />
          </span>
        </>
      )}
    </div>
  );
}

export function CtaArt() {
  return (
    <div className="cv-cta-art" aria-hidden="true">
      <svg viewBox="0 0 520 130" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cv-cta-arc" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#29a387" stopOpacity="0" />
            <stop offset="0.6" stopColor="#5fd3ae" stopOpacity="0.85" />
            <stop offset="1" stopColor="#c5eedd" stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id="cv-cta-orb" cx="0.55" cy="0.9" r="0.6">
            <stop offset="0" stopColor="#3dbe8b" stopOpacity="0.45" />
            <stop offset="1" stopColor="#3dbe8b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="300" cy="150" rx="220" ry="120" fill="url(#cv-cta-orb)" />
        <path
          d="M10 130 C 140 60, 300 20, 470 30"
          fill="none"
          stroke="url(#cv-cta-arc)"
          strokeWidth="2"
        />
        <g className="cv-cta-device">
          <rect x="330" y="26" width="92" height="58" rx="6" />
          <rect x="318" y="84" width="116" height="10" rx="3" />
          <path d="M346 100 h80 M336 112 h100" />
        </g>
      </svg>
    </div>
  );
}
