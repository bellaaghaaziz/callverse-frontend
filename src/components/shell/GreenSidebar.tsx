import { Headphones } from "lucide-react";

// Green-direction sidebar (R4.7, 2026-10-11 dashboard mockup). The swooshes are
// decoration, hidden from assistive technology; the space card is plain text.
const spaceByRole: Record<string, { title: string; text: string }> = {
  Superviseur: {
    title: "Espace superviseur",
    text: "Pilotez, accompagnez et gardez une longueur d’avance.",
  },
};

export function SidebarArt() {
  return (
    <svg
      className="cv-shell-art"
      aria-hidden="true"
      viewBox="0 0 208 520"
      preserveAspectRatio="xMinYMax slice"
    >
      <defs>
        <linearGradient id="cv-shell-swoosh" x1="0" y1="1" x2="1" y2="0">
          <stop
            offset="0"
            style={{ stopColor: "var(--lp-glow)" }}
            stopOpacity="0"
          />
          <stop
            offset="0.6"
            style={{ stopColor: "var(--lp-glow)" }}
            stopOpacity="0.55"
          />
          <stop
            offset="1"
            style={{ stopColor: "var(--lp-glow)" }}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path
        className="cv-shell-swoosh"
        d="M-20 330 C 40 250, 120 190, 230 150"
      />
      <path
        className="cv-shell-swoosh cv-shell-swoosh-thin"
        d="M-10 380 C 60 300, 140 250, 230 110"
      />
      <path
        className="cv-shell-swoosh cv-shell-swoosh-thin"
        d="M-20 560 C 50 470, 120 330, 230 260"
      />
    </svg>
  );
}

export function SpaceCard({ role }: { role: string }) {
  const space = spaceByRole[role];
  if (!space) return null;
  return (
    <div className="cv-space-card">
      <span className="cv-space-icon" aria-hidden="true">
        <Headphones size={18} />
      </span>
      <strong>{space.title}</strong>
      <p>{space.text}</p>
    </div>
  );
}
