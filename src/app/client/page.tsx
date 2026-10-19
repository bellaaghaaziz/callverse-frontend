"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Download, MessageSquarePlus, TriangleAlert, Wallet } from "lucide-react";
import { useCustomer } from "@/components/customer/CustomerShell";
import { apiFetch } from "@/lib/api";
import { money, type Schema } from "@/lib/contracts";
import { conversationHeading, greeting, totalBalance } from "@/lib/customer";
import type { ConversationChoice } from "@/components/ConversationPicker";

const LIVE = ["QUEUED", "ASSIGNED", "ACTIVE", "ESCALATED"];
const movementStatus: Record<string, string> = { PENDING: "En attente", REJECTED: "Refusé", DISPUTED: "Contesté" };
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

// The home page answers three questions only: how much do I have, what happened lately,
// and how do I reach the bank. Everything else has its own page.
export default function ClientHome() {
  const { profile, error } = useCustomer();
  const [movements, setMovements] = useState<Schema["Transaction"][] | null>(null);
  const [live, setLive] = useState<ConversationChoice | null>(null);
  const [incidents, setIncidents] = useState<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const controller = new AbortController();
    const { signal } = controller;
    apiFetch<Schema["TransactionsResponse"]>("/me/transactions?count=4", { signal })
      .then(r => { if (!signal.aborted) setMovements(r.transactions); }).catch(() => { if (!signal.aborted) setMovements([]); });
    apiFetch<{ content: ConversationChoice[] }>("/conversations/accessible?page=0", { signal })
      .then(r => { if (!signal.aborted) setLive(r.content.find(c => LIVE.includes(c.status)) || null); }).catch(() => {});
    apiFetch<Schema["ServiceIncidentsResponse"]>("/service-incidents", { signal })
      .then(r => { if (!signal.aborted) setIncidents(r.incidents.length); }).catch(() => {});
    return () => controller.abort();
  }, []);
  const balance = profile ? totalBalance(profile.accounts) : null;
  const heading = live ? conversationHeading(live) : null;
  return (
    <div className="cv-cs-stack">
      <section className="cv-cs-hero cv-cs-reveal" data-tour="client-welcome">
        <div>
          <p className="cv-cs-eyebrow">Mon espace</p>
          <h1>{now ? greeting(now, profile?.firstName) : "Bonjour"}</h1>
          <p className="cv-cs-lead">Heureux de vous revoir. Voici l’essentiel de vos comptes aujourd’hui.</p>
        </div>
        <div className="cv-cs-balance" data-tour="client-balance">
          <span>Total de vos comptes</span>
          <strong aria-live="polite">{balance === null ? "—" : money(balance, "EUR")}</strong>
          <small>{profile ? `${profile.accounts.length} compte${profile.accounts.length > 1 ? "s" : ""}` : error || "Chargement…"}</small>
        </div>
      </section>

      <section className="cv-cs-actions" aria-label="Actions rapides" data-tour="client-actions">
        <Link href="/client/messages?nouveau=1" className="cv-cs-action cv-cs-reveal" style={{ animationDelay: "60ms" }}>
          <MessageSquarePlus size={26} aria-hidden="true" /><strong>Écrire à un conseiller</strong><span>Une question, un souci de carte ?</span>
        </Link>
        <Link href="/client/comptes" className="cv-cs-action cv-cs-reveal" style={{ animationDelay: "120ms" }}>
          <Wallet size={26} aria-hidden="true" /><strong>Voir mes comptes</strong><span>Soldes, cartes et opérations</span>
        </Link>
        <Link href="/client/comptes#releve" className="cv-cs-action cv-cs-reveal" style={{ animationDelay: "180ms" }}>
          <Download size={26} aria-hidden="true" /><strong>Télécharger un relevé</strong><span>Vos opérations sur une période</span>
        </Link>
      </section>

      {live && heading && (
        <Link href={`/client/messages?conversation=${live.id}`} className="cv-cs-live cv-cs-reveal">
          <span className="cv-cs-live-dot" aria-hidden="true" />
          <span><strong>Conversation en cours · {heading.subtitle}</strong><small>{heading.title}</small></span>
          <span className="cv-cs-live-cta">Reprendre <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>
      )}

      <div className="cv-cs-columns">
        <section className="cv-cs-card cv-cs-reveal" data-tour="client-activity" style={{ animationDelay: "240ms" }}>
          <div className="cv-cs-card-head"><h2>Dernières opérations</h2><Link href="/client/comptes">Tout voir</Link></div>
          {movements === null ? <p className="cv-muted">Chargement…</p> : movements.length === 0 ? <p className="cv-muted">Aucune opération récente.</p> :
            <ul className="cv-cs-movements">{movements.map(m => (
              <li key={m.id}>
                <span><strong>{m.counterparty || m.label}</strong><small>{day.format(new Date(m.bookedAt))}{movementStatus[m.status] ? " · " + movementStatus[m.status] : ""}</small></span>
                <span className={"cv-cs-amount" + (m.amount > 0 ? " cv-cs-amount-in" : "") + (m.status === "REJECTED" ? " cv-cs-amount-rejected" : "")}>{(m.amount > 0 ? "+" : "") + money(m.amount, m.currency)}</span>
              </li>))}</ul>}
        </section>
        <section className="cv-cs-card cv-cs-reveal" style={{ animationDelay: "300ms" }}>
          <div className="cv-cs-card-head"><h2>Nos services</h2><Link href="/client/aide">Aide et suivi</Link></div>
          {incidents === null ? <p className="cv-muted">Vérification…</p> : incidents === 0
            ? <p className="cv-cs-status cv-cs-status-ok"><CheckCircle2 size={20} aria-hidden="true" />Tous nos services fonctionnent normalement.</p>
            : <p className="cv-cs-status cv-cs-status-warn"><TriangleAlert size={20} aria-hidden="true" />{incidents === 1 ? "Un incident est en cours." : `${incidents} incidents sont en cours.`} <Link href="/client/aide">Voir le détail</Link></p>}
          <p className="cv-muted">Besoin d’aide ? Retrouvez votre conseiller dans Messagerie. L’assistant vous accompagne avant la prise en charge humaine.</p>
        </section>
      </div>
    </div>
  );
}
