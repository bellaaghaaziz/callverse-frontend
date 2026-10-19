"use client";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, PiggyBank, Wallet } from "lucide-react";
import { useCustomer } from "@/components/customer/CustomerShell";
import StatementDownload from "@/components/customer/StatementDownload";
import { apiFetch, errorMessage } from "@/lib/api";
import { money, type Schema } from "@/lib/contracts";
import { totalBalance } from "@/lib/customer";
import { spendingByKind } from "@/lib/charts";
import BarList from "@/components/charts/BarList";

const movementStatus: Record<string, string> = { BOOKED: "Effectué", PENDING: "En attente", REJECTED: "Refusé", DISPUTED: "Contesté" };
const cardStatus: Record<string, string> = { ACTIVE: "Active", BLOCKED: "Bloquée", EXPIRED: "Expirée", CANCELLED: "Annulée" };
const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const expiry = new Intl.DateTimeFormat("fr-FR", { month: "2-digit", year: "2-digit" });

// Accounts, cards and movements on their own page, as in a bank's app: the balance first,
// then the cards, then the movements grouped by day, then the statement.
export default function ClientAccounts() {
  const { profile, error } = useCustomer();
  const [movements, setMovements] = useState<Schema["Transaction"][] | null>(null);
  const [movementsError, setMovementsError] = useState("");
  const [account, setAccount] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiFetch<Schema["TransactionsResponse"]>("/me/transactions?count=50", { signal: controller.signal })
      .then(r => { if (!controller.signal.aborted) setMovements(r.transactions); })
      .catch(e => { if (!controller.signal.aborted) { setMovements([]); setMovementsError(errorMessage(e)); } });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (window.location.hash === "#releve") requestAnimationFrame(() => document.getElementById("releve")?.scrollIntoView({ behavior: "smooth" }));
  }, []);
  const spending = useMemo(() => spendingByKind(movements || [], new Date(), 30), [movements]);
  const byDay = useMemo(() => {
    const groups = new Map<string, Schema["Transaction"][]>();
    for (const m of movements || []) {
      if (account && m.accountId !== account) continue;
      const key = m.bookedAt.slice(0, 10);
      groups.set(key, [...(groups.get(key) || []), m]);
    }
    return [...groups.entries()];
  }, [movements, account]);
  return (
    <div className="cv-cs-stack">
      <section className="cv-cs-page-head cv-cs-reveal" data-tour="client-welcome">
        <p className="cv-cs-eyebrow">Mes comptes</p>
        <h1>{profile ? money(totalBalance(profile.accounts), "EUR") : "Mes comptes"}</h1>
        <p className="cv-cs-lead">Total disponible sur vos comptes en euros.</p>
      </section>
      {error && <p role="alert" className="cv-error">{error}</p>}

      <section className="cv-cs-accounts" aria-label="Mes comptes et cartes" data-tour="client-accounts">
        {!profile && !error && <p className="cv-muted">Chargement de vos comptes…</p>}
        {profile?.accounts.map((a, index) => {
          const savings = a.product?.category === "SAVINGS";
          return (
            <article key={a.id} className="cv-cs-account-card cv-cs-reveal" style={{ animationDelay: `${index * 80}ms` }}>
              <header>
                <span className={"cv-cs-account-icon" + (savings ? " cv-cs-account-icon-savings" : "")} aria-hidden="true">{savings ? <PiggyBank size={20} /> : <Wallet size={20} />}</span>
                <div><h2>{a.product?.name || "Compte bancaire"}</h2><p>{a.maskedIban}</p></div>
              </header>
              <strong className={"cv-cs-account-balance" + (a.balance < 0 ? " cv-cs-amount-rejected" : "")}>{money(a.balance, a.currency)}</strong>
              {a.overdraftLimit > 0 && <p className="cv-muted">Découvert autorisé : {money(a.overdraftLimit, a.currency)}</p>}
              {a.cards.map(card => (
                <div key={card.id} className={"cv-cs-bank-card" + (card.network === "MASTERCARD" ? " cv-cs-bank-card-alt" : "")}>
                  <CreditCard size={22} aria-hidden="true" />
                  <span className="cv-cs-bank-card-number" aria-label={`Carte ${card.network} se terminant par ${card.panLast4}`}>•••• •••• •••• {card.panLast4}</span>
                  <span className="cv-cs-bank-card-meta"><span>{card.type === "CREDIT" ? "Crédit" : "Débit"} · {cardStatus[card.status] || card.status}</span><span>Exp. {expiry.format(new Date(card.expiresOn))}</span></span>
                  <span className="cv-cs-bank-card-network">{card.network}</span>
                </div>
              ))}
            </article>
          );
        })}
        {profile && !profile.accounts.length && <p className="cv-notice">Aucun compte n’est encore rattaché à votre espace. Écrivez à votre conseiller pour découvrir nos offres.</p>}
      </section>

      <section className="cv-cs-card cv-cs-reveal" data-tour="client-spending">
        <BarList title="Mes dépenses sur 30 jours" empty="Aucune dépense ces 30 derniers jours."
          format={value => money(value, "EUR")}
          items={spending.map(row => ({ key: row.kind, label: row.label, value: row.total }))} />
      </section>

      <section className="cv-cs-card cv-cs-reveal" data-tour="client-movements">
        <div className="cv-cs-card-head">
          <h2>Mes opérations</h2>
          {profile && profile.accounts.length > 1 && (
            <label className="cv-cs-filter">Compte
              <select className="cv-input" value={account} onChange={e => setAccount(e.target.value)}>
                <option value="">Tous mes comptes</option>
                {profile.accounts.map(a => <option key={a.id} value={a.id}>{a.product?.name || a.maskedIban}</option>)}
              </select>
            </label>
          )}
        </div>
        {movementsError && <p role="alert" className="cv-error">{movementsError}</p>}
        {movements === null ? <p className="cv-muted">Chargement de vos opérations…</p> : byDay.length === 0 ? <p className="cv-muted">Aucune opération sur cette période.</p> :
          byDay.map(([key, items]) => (
            <div key={key} className="cv-cs-day">
              <h3>{day.format(new Date(key + "T12:00:00"))}</h3>
              <ul className="cv-cs-movements">{items.map(m => (
                <li key={m.id}>
                  <span><strong>{m.counterparty || m.label}</strong><small>{m.label}{m.status !== "BOOKED" ? " · " + (movementStatus[m.status] || m.status) : ""}</small></span>
                  <span className={"cv-cs-amount" + (m.amount > 0 ? " cv-cs-amount-in" : "") + (m.status === "REJECTED" ? " cv-cs-amount-rejected" : "")}>{(m.amount > 0 ? "+" : "") + money(m.amount, m.currency)}</span>
                </li>))}</ul>
            </div>))}
      </section>

      <section className="cv-cs-card cv-cs-reveal" id="releve" data-tour="client-statement">
        <div className="cv-cs-card-head"><h2>Télécharger un relevé</h2></div>
        <p className="cv-muted">Choisissez une période : vous recevez un fichier lisible avec un tableur.</p>
        <StatementDownload />
      </section>
    </div>
  );
}
