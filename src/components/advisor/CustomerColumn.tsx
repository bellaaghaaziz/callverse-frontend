import type { ReactNode } from "react";
import { ArrowRightLeft, CreditCard, User } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { money } from "@/lib/contracts";
import { initialsFor, segmentLabel } from "@/lib/presentation";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";

// The customer file beside the conversation; the action forms sit below it.
export default function AdvisorCustomerColumn({
  workspace,
  children,
}: {
  workspace: AdvisorWorkspace;
  children: ReactNode;
}) {
  const {
    customer,
    customerName,
    transactions,
    busy,
    perform,
    handleBlockCard,
  } = workspace;
  return (
    <aside className="cv-customer-column">
      <section className="cv-card">
        {customer ? (
          <>
            <div className="cv-customer-header">
              <span className="cv-avatar">{initialsFor(customerName)}</span>
              <h2>{customerName}</h2>
              <p>DOSSIER CLIENT · {customer.externalRef}</p>
            </div>
            <div className="cv-profile-section">
              <h3>
                Informations client <User size={13} />
              </h3>
              <dl className="cv-meta-list">
                <div>
                  <dt>Segment</dt>
                  <dd>{segmentLabel[customer.segment] || customer.segment}</dd>
                </div>
                <div>
                  <dt>Région</dt>
                  <dd>{customer.region}</dd>
                </div>
                <div>
                  <dt>Ancienneté</dt>
                  <dd>{customer.tenureMonths} mois</dd>
                </div>
              </dl>
            </div>
            <div className="cv-profile-section">
              <h3>
                Comptes & cartes <CreditCard size={13} />
              </h3>
              {customer.accounts.map((account) => (
                <div key={account.id} className="cv-account-card">
                  <p>{account.product.name}</p>
                  <strong>{money(account.balance, account.currency)}</strong>
                  <p>{account.maskedIban}</p>
                  <p className="mt-2">
                    Découvert :{" "}
                    {money(account.overdraftLimit, account.currency)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge
                      status={account.status}
                      label={account.status === "ACTIVE" ? "Actif" : undefined}
                    />
                  </div>
                  {account.cards.map((card) => (
                    <div className="cv-bank-card" key={card.id}>
                      <p>•••• {card.panLast4}</p>
                      {card.status === "ACTIVE" ? (
                        <button
                          className="cv-button cv-button-danger"
                          disabled={busy}
                          onClick={() =>
                            perform(() => handleBlockCard(card.id))
                          }
                        >
                          Bloquer
                        </button>
                      ) : (
                        <StatusBadge status={card.status} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="cv-profile-section">
              <h3>
                Dernières opérations <ArrowRightLeft size={13} />
              </h3>
              {transactions.slice(0, 5).map((t) => (
                <div className="cv-list-row" key={t.id}>
                  <div>
                    <strong>{t.label}</strong>
                  </div>
                  <span
                    className={t.amount < 0 ? "cv-negative" : "cv-positive"}
                  >
                    {money(t.amount, t.currency)}
                  </span>
                </div>
              ))}
              {!transactions.length && (
                <p className="cv-muted">Aucune opération récente.</p>
              )}
            </div>
          </>
        ) : (
          <div className="cv-empty">
            <User size={26} />
            <strong>Le contexte fait la différence.</strong>Les informations
            client apparaîtront avec votre conversation.
          </div>
        )}
      </section>
      {children}
    </aside>
  );
}
