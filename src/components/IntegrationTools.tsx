"use client";
import { useEffect, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import type { Customer, Conversation, Schema } from "@/lib/contracts";
import {
  Headphones,
  Search,
  BookOpen,
  Activity,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  skillLabel,
  intentLabel,
  initialsFor,
  serviceLabel,
} from "@/lib/presentation";
export function FrontDesk({
  onOpened,
}: {
  onOpened?: (conversation: Conversation) => void;
}) {
  const [reference, setReference] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [skill, setSkill] = useState("FRAUD");
  const [intent, setIntent] = useState("FRAUD");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setCustomer(null);
    setNotice("");
    try {
      setCustomer(
        await apiFetch<Customer>(
          `/customers?externalRef=${encodeURIComponent(reference.trim())}`,
        ),
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function open() {
    if (!customer) return;
    setBusy(true);
    setNotice("");
    try {
      const conversation = await apiFetch<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          skill,
          ...(intent ? { intent } : {}),
        }),
      });
      setNotice(
        `Contact enregistré. Identifiant à transmettre au client : ${conversation.id}`,
      );
      onOpened?.(conversation);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="cv-card cv-card-pad">
      <h2 className="cv-tool-title">
        <Headphones size={18} />
        Enregistrer un contact
      </h2>
      <p className="cv-subtitle mb-4">
        Retrouvez le client, puis orientez sa demande vers la bonne file.
      </p>
      <form onSubmit={lookup} className="cv-inline-form">
        <input
          aria-label="Référence client"
          required
          maxLength={100}
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            setCustomer(null);
          }}
          className="cv-input"
          placeholder="Référence client, ex. DEMO-00418"
        />
        <button disabled={busy} className="cv-button">
          <Search size={13} />
          Rechercher
        </button>
      </form>
      {customer && (
        <div className="cv-result">
          <div className="flex items-center gap-3 mb-4">
            <span className="cv-avatar cv-avatar-light">
              {initialsFor(customer.firstName + " " + customer.lastName)}
            </span>
            <div>
              <h3>
                {customer.firstName} {customer.lastName}
              </h3>
              <p>{customer.externalRef}</p>
            </div>
          </div>
          <div className="cv-form-row">
            <label className="cv-field">
              <span className="cv-label">Compétence</span>
              <select
                aria-label="Compétence"
                className="cv-input"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              >
                {["ACCOUNTS", "CARDS", "CREDIT", "FRAUD"].map((value) => (
                  <option key={value} value={value}>
                    {skillLabel[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="cv-field">
              <span className="cv-label">Motif</span>
              <select
                aria-label="Motif"
                className="cv-input"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
              >
                <option value="">Sans motif</option>
                {[
                  "BALANCE",
                  "CARD",
                  "CREDIT",
                  "FRAUD",
                  "ACCOUNT_CLOSURE",
                  "OTHER",
                ].map((value) => (
                  <option key={value} value={value}>
                    {intentLabel[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={open}
            className="cv-button"
          >
            Enregistrer dans la file
            <ArrowRight size={13} />
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="cv-notice mt-4 break-all">
          {notice}
        </p>
      )}
    </section>
  );
}

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Schema["KnowledgeArticle"][]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSearched(true);
    setError("");
    try {
      const data = await apiFetch<Schema["KnowledgeArticlesResponse"]>(
        `/kb/articles?q=${encodeURIComponent(query.trim())}&limit=5`,
      );
      setArticles(data.articles);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="cv-card cv-card-pad">
      <h2 className="cv-tool-title">
        <BookOpen size={18} />
        Procédures
      </h2>
      <p className="cv-subtitle mb-4">
        Consultez les réponses et les procédures de votre base de connaissances.
      </p>
      <form onSubmit={search} className="cv-inline-form">
        <input
          aria-label="Recherche de procédures"
          required
          minLength={2}
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="cv-input"
          placeholder="Carte bloquée, fraude, crédit…"
        />
        <button
          disabled={busy || query.trim().length < 2}
          className="cv-button"
        >
          <Search size={13} />
          Rechercher
        </button>
      </form>
      {error && (
        <p role="alert" className="cv-error mt-4">
          {error}
        </p>
      )}
      {articles.map((article) => (
        <details key={article.id} className="cv-result">
          <summary className="cursor-pointer text-sm font-semibold">
            {article.title}
          </summary>
          <p className="mt-3">{article.content}</p>
        </details>
      ))}
      {!busy && !error && articles.length === 0 && (
        <p className="cv-muted mt-4">
          {searched
            ? "Aucune procédure trouvée. Essayez un autre mot-clé."
            : "Recherchez un sujet pour afficher les procédures."}
        </p>
      )}
      {busy && <p className="cv-muted mt-4">Recherche en cours…</p>}
    </section>
  );
}

export function Incidents({ region }: { region?: string }) {
  const [incidents, setIncidents] = useState<Schema["ServiceIncident"][]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setLoading(true);
    // Fetch all, then include both this region and national incidents.
    apiFetch<Schema["ServiceIncidentsResponse"]>("/service-incidents", {
      signal: controller.signal,
    })
      .then((data) =>
        setIncidents(
          data.incidents.filter(
            (incident) =>
              !region || !incident.region || incident.region === region,
          ),
        ),
      )
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [region, version]);
  return (
    <section className="cv-card cv-card-pad">
      <div className="flex justify-between gap-3 items-center mb-4">
        <h2 className="cv-tool-title !mb-0">
          <Activity size={18} />
          Incidents de service {region ? "· " + region : ""}
        </h2>
        <button
          type="button"
          className="cv-icon-button"
          aria-label="Actualiser les incidents"
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={13} />
        </button>
      </div>
      {error ? (
        <p role="alert" className="cv-error">
          {error}
        </p>
      ) : loading ? (
        <p className="cv-muted">Vérification des services…</p>
      ) : incidents.length ? (
        incidents.map((incident) => (
          <div key={incident.id} className="cv-result">
            <div className="flex justify-between gap-3 mb-2">
              <h3>{serviceLabel[incident.service] || incident.service}</h3>
              <span className="cv-badge cv-badge-amber">
                Gravité {incident.severity}
              </span>
            </div>
            <p>{incident.description}</p>
            <p className="!text-[10px] mt-2">
              {incident.region || "National"}
              {incident.estimatedEnd
                ? " · Fin estimée : " +
                  new Date(incident.estimatedEnd).toLocaleString("fr-FR")
                : ""}
            </p>
          </div>
        ))
      ) : (
        <div className="cv-notice flex gap-3 items-center">
          <CheckCircle2 size={19} />
          <div>
            <strong>Aucun incident actif.</strong>
            <p className="text-[11px] mt-1">
              Les services ne signalent aucune interruption
              {region ? " dans votre région" : ""}.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
