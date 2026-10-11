import { ESCALATION_REASON_MAX_LENGTH } from "@/lib/contracts";
import type { ActionForms } from "@/hooks/useActionForms";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";

// Ticket and escalation forms. Focus moves into them and back through useActionForms.
export default function AdvisorActionForms({
  workspace,
  forms,
  handleOpenTicket,
  handleEscalate,
}: {
  workspace: AdvisorWorkspace;
  forms: ActionForms;
  handleOpenTicket: () => Promise<void>;
  handleEscalate: () => Promise<void>;
}) {
  const { busy, perform } = workspace;
  const {
    ticketOpen,
    setTicketOpen,
    ticket,
    setTicket,
    ticketTitle,
    escalationOpen,
    setEscalationOpen,
    escalationReason,
    setEscalationReason,
    escalationField,
  } = forms;
  return (
    <>
      {(ticketOpen || escalationOpen) && (
        <section className="cv-card cv-action-form">
          {ticketOpen ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void perform(handleOpenTicket);
              }}
            >
              <h3>Ouvrir un ticket</h3>
              <label className="cv-field">
                <span className="cv-label">Titre du ticket</span>
                <input
                  ref={ticketTitle}
                  aria-label="Titre du ticket"
                  required
                  minLength={3}
                  maxLength={140}
                  className="cv-input"
                  value={ticket.title}
                  onChange={(e) =>
                    setTicket({ ...ticket, title: e.target.value })
                  }
                />
              </label>
              <label className="cv-field">
                <span className="cv-label">Description du ticket</span>
                <textarea
                  aria-label="Description du ticket"
                  required
                  minLength={5}
                  maxLength={4000}
                  className="cv-input"
                  value={ticket.description}
                  onChange={(e) =>
                    setTicket({ ...ticket, description: e.target.value })
                  }
                />
              </label>
              <div className="cv-form-row">
                <label className="cv-field">
                  <span className="cv-label">Catégorie du ticket</span>
                  <select
                    aria-label="Catégorie du ticket"
                    className="cv-input"
                    value={ticket.category}
                    onChange={(e) =>
                      setTicket({ ...ticket, category: e.target.value })
                    }
                  >
                    {["FRAUD", "CARD", "CREDIT", "ACCOUNT", "OTHER"].map(
                      (value) => (
                        <option key={value} value={value}>
                          {
                            (
                              {
                                FRAUD: "Fraude",
                                CARD: "Carte",
                                CREDIT: "Crédit",
                                ACCOUNT: "Compte",
                                OTHER: "Autre",
                              } as Record<string, string>
                            )[value]
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="cv-field">
                  <span className="cv-label">Gravité du ticket</span>
                  <select
                    aria-label="Gravité du ticket"
                    className="cv-input"
                    value={ticket.severity}
                    onChange={(e) =>
                      setTicket({
                        ...ticket,
                        severity: Number(e.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} / 5
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  className="cv-button"
                  disabled={
                    busy || !ticket.title.trim() || !ticket.description.trim()
                  }
                >
                  Créer le ticket
                </button>
                <button
                  type="button"
                  className="cv-button cv-button-secondary"
                  onClick={() => setTicketOpen(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void perform(handleEscalate);
              }}
            >
              <h3>Demander une intervention</h3>
              <p className="cv-subtitle mb-4" id="escalation-help">
                Le superviseur recevra votre demande avec le contexte de la
                conversation.
              </p>
              <label className="cv-field">
                <span className="cv-label">Motif d’escalade</span>
                <textarea
                  ref={escalationField}
                  aria-label="Motif d’escalade"
                  aria-describedby="escalation-help"
                  required
                  minLength={3}
                  maxLength={ESCALATION_REASON_MAX_LENGTH}
                  className="cv-input"
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  className="cv-button"
                  disabled={busy || !escalationReason.trim()}
                >
                  Confirmer l’escalade
                </button>
                <button
                  type="button"
                  className="cv-button cv-button-secondary"
                  onClick={() => setEscalationOpen(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </>
  );
}
