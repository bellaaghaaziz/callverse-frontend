import { ArrowUpRight, Bell, ShieldCheck } from "lucide-react";
import type { SupervisionAlert } from "@/lib/contracts";
import { timeLabel } from "@/lib/presentation";
import { alertCustomerLabel } from "@/lib/supervision";
import CardHeading from "./CardHeading";

// « Alertes de la session »: the live alerts since login, or a calm empty state.
export default function AlertsCard({
  alerts,
  names,
  onOpen,
}: {
  alerts: SupervisionAlert[];
  names: Record<string, string>;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="cv-card" id="alerts">
      <CardHeading
        icon={Bell}
        title="Alertes de la session"
        subtitle="Les événements reçus depuis votre connexion"
        count={alerts.length}
      />
      <div className="cv-alert-list">
        {!alerts.length && (
          <div className="cv-empty cv-alerts-empty">
            <ShieldCheck size={30} />
            <strong>Tout est calme pour le moment.</strong>
            <p>Les nouvelles alertes s’afficheront ici.</p>
            <svg
              className="cv-alerts-wave"
              aria-hidden="true"
              viewBox="0 0 500 90"
              preserveAspectRatio="none"
            >
              <path d="M0 52 C 120 20, 230 80, 340 46 S 460 30, 500 40 V 90 H 0 Z" />
              <path d="M0 70 C 140 44, 250 92, 360 64 S 470 54, 500 62 V 90 H 0 Z" />
            </svg>
          </div>
        )}
        {alerts.map((alert) => (
          <div
            key={
              alert.type +
              ":" +
              alert.escalationId +
              ":" +
              alert.cardId +
              ":" +
              alert.occurredAt
            }
            className="cv-result cv-alert"
          >
            <div className="cv-alert-top">
              <span className="cv-badge cv-badge-rose">
                {alert.type === "ESCALATION_RAISED"
                  ? "Intervention demandée"
                  : "Carte bloquée · " + (alert.cardLast4 || "")}
              </span>
              <span className="cv-muted">{timeLabel(alert.occurredAt)}</span>
            </div>
            <p className="cv-key" title={alert.customerId}>
              {alertCustomerLabel(alert.customerId, names[alert.customerId])}
            </p>
            {alert.conversationId && (
              <button
                className="cv-button cv-button-secondary cv-button-small"
                onClick={() => onOpen(alert.conversationId!)}
              >
                Ouvrir la conversation
                <ArrowUpRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
