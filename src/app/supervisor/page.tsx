"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import ConversationPanel from "@/components/ConversationPanel";
import { FrontDesk } from "@/components/IntegrationTools";
import { apiFetch, errorMessage } from "@/lib/api";
import type { LiveKpi, SupervisionAlert } from "@/lib/contracts";
import { useConnection, useTopic } from "@/hooks/useTopic";
import { reconnectStomp } from "@/lib/stomp";
import {
  RefreshCw,
  Clock,
  Headphones,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { skillLabel, timeLabel } from "@/lib/presentation";
const percent = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
export default function SupervisorPage() {
  const [kpi, setKpi] = useState<LiveKpi | null>(null);
  const [alerts, setAlerts] = useState<SupervisionAlert[]>([]);
  const [error, setError] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const connection = useConnection();
  const latestAt = useRef("");
  const requestVersion = useRef(0);
  const acceptKpi = useCallback((snapshot: LiveKpi) => {
    if (snapshot.schemaVersion !== 1 || snapshot.at < latestAt.current) return;
    latestAt.current = snapshot.at;
    setKpi(snapshot);
  }, []);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const snapshot = await apiFetch<LiveKpi>("/supervision/kpi");
      if (version === requestVersion.current) {
        acceptKpi(snapshot);
        setError("");
      }
    } catch (error) {
      if (version === requestVersion.current) setError(errorMessage(error));
    }
  }, [acceptKpi]);
  useEffect(() => {
    const invalidate = () => {
      ++requestVersion.current;
    };
    void refresh();
    window.addEventListener("callverse:reconnected", refresh);
    return () => {
      invalidate();
      window.removeEventListener("callverse:reconnected", refresh);
    };
  }, [refresh]);
  useTopic<LiveKpi>("/topic/supervision/kpi", acceptKpi);
  useTopic<SupervisionAlert>("/topic/supervision/alerts", (alert) =>
    setAlerts((previous) => {
      const key = (item: SupervisionAlert) =>
        `${item.type}:${item.escalationId || item.cardId}:${item.occurredAt}`;
      if (previous.some((item) => key(item) === key(alert))) return previous;
      return [alert, ...previous]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 100);
    }),
  );
  const metrics = [
    ["En attente", kpi?.waitingTotal ?? "—"],
    ["En conversation", kpi?.inService ?? "—"],
    ["Résolues aujourd'hui", kpi?.resolvedToday ?? "—"],
    ["Abandonnées aujourd'hui", kpi?.abandonedToday ?? "—"],
    [
      "Attente moyenne",
      kpi?.averageWaitSeconds == null
        ? "—"
        : `${Math.round(kpi.averageWaitSeconds)} s`,
    ],
    ["Respect du délai cible", percent(kpi?.slaRatio)],
    ["Taux d'abandon", percent(kpi?.abandonRate)],
  ];
  const mainMetrics = metrics.slice(0, 4);
  return (
    <AppShell role="Superviseur" initials="SV" title="Vue d’ensemble">
      <div className="cv-page-heading" id="workspace">
        <div>
          <p className="cv-eyebrow">PILOTAGE DE L’ACTIVITÉ</p>
          <h1>Gardez une longueur d’avance.</h1>
          <p className="cv-subtitle">
            Les files, les indicateurs et les alertes de votre équipe, en
            direct.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              "cv-live " + (connection !== "connected" ? "cv-live-off" : "")
            }
          >
            {connection === "connected"
              ? "Flux live connecté"
              : "Connexion interrompue"}
          </span>
          <button
            onClick={() => {
              reconnectStomp();
              void refresh();
            }}
            className="cv-button cv-button-secondary cv-button-small"
          >
            <RefreshCw size={13} />
            Actualiser
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="cv-error mb-5">
          {error}
        </p>
      )}
      <div className="cv-stat-grid">
        {mainMetrics.map(([label, value], i) => (
          <div className="cv-card cv-stat" key={label}>
            <div className="cv-stat-top">
              <span>{label}</span>
              {i === 0 ? (
                <Clock size={16} />
              ) : i === 1 ? (
                <Headphones size={16} />
              ) : i === 2 ? (
                <CheckCircle2 size={16} />
              ) : (
                <LogOut size={16} />
              )}
            </div>
            <p className="cv-stat-value">{value}</p>
            <p className="cv-stat-foot">
              {i < 2 ? "Situation actuelle" : "Depuis le début de la journée"}
            </p>
          </div>
        ))}
      </div>
      <div className="cv-two-columns">
        <section className="cv-card">
          <div className="cv-card-heading">
            <div>
              <h2>Files par compétence</h2>
              <p>Répartition des contacts en attente</p>
            </div>
            <span className="cv-count">{kpi?.queues.length || 0}</span>
          </div>
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Compétence</th>
                  <th>En attente</th>
                  <th>Attente la plus longue</th>
                </tr>
              </thead>
              <tbody>
                {kpi?.queues.map((queue) => (
                  <tr key={queue.skill}>
                    <td>
                      <span
                        className={
                          "cv-status-dot mr-2 " +
                          (queue.skill === "FRAUD"
                            ? "text-rose-400"
                            : "text-emerald-600")
                        }
                      />
                      {skillLabel[queue.skill] || queue.skill}
                    </td>
                    <td>
                      <span className="cv-count">{queue.waiting}</span>
                    </td>
                    <td>
                      {queue.oldestWaitSeconds == null
                        ? "—"
                        : Math.round(queue.oldestWaitSeconds) + " s"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!kpi && <div className="cv-empty">Chargement de l’activité…</div>}
          <div className="grid grid-cols-3 border-t border-[#edf0e9] p-5 gap-4">
            {metrics.slice(4).map(([label, value]) => (
              <div key={label}>
                <p className="cv-muted">{label}</p>
                <p className="text-lg mt-2 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="cv-muted px-5 pb-5">
            Les indicateurs affichent « — » lorsqu’aucune mesure n’est
            disponible.{kpi ? " · Mise à jour " + timeLabel(kpi.at) : ""}
          </p>
        </section>
        <section className="cv-card" id="alerts">
          <div className="cv-card-heading">
            <div>
              <h2>Alertes de la session</h2>
              <p>Les événements reçus depuis votre connexion</p>
            </div>
            <span className="cv-count">{alerts.length}</span>
          </div>
          <div className="max-h-[440px] overflow-y-auto p-5">
            {!alerts.length && (
              <div className="cv-empty">
                <ShieldCheck size={28} />
                <strong>Tout est calme pour le moment.</strong>Les nouvelles
                alertes s’afficheront ici.
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
                className="cv-result !mt-0 mb-3"
              >
                <div className="flex gap-2 justify-between mb-2">
                  <span className="cv-badge cv-badge-rose">
                    {alert.type === "ESCALATION_RAISED"
                      ? "Intervention demandée"
                      : "Carte bloquée · " + (alert.cardLast4 || "")}
                  </span>
                  <span className="cv-muted">
                    {timeLabel(alert.occurredAt)}
                  </span>
                </div>
                <p className="cv-key">Client : {alert.customerId}</p>
                {alert.conversationId && (
                  <button
                    className="cv-button cv-button-secondary cv-button-small mt-3"
                    onClick={() => {
                      setSelectedId(alert.conversationId);
                      document
                        .getElementById("conversation")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Ouvrir la conversation
                    <ArrowUpRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="cv-section cv-card cv-card-pad" id="conversation">
        <h2 className="cv-tool-title">
          <MessageSquare size={18} />
          Consulter une conversation
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSelectedId(lookupId.trim());
          }}
          className="cv-inline-form"
        >
          <input
            aria-label="Identifiant de conversation"
            required
            pattern="[0-9a-fA-F-]{36}"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            className="cv-input"
            placeholder="Identifiant de conversation"
          />
          <button className="cv-button">
            Ouvrir
            <ArrowUpRight size={13} />
          </button>
        </form>
      </section>
      {selectedId && (
        <div className="cv-section">
          <ConversationPanel
            key={selectedId}
            id={selectedId}
            role="SUPERVISOR"
          />
        </div>
      )}
      <div className="cv-section" id="frontdesk">
        <FrontDesk
          onOpened={(conversation) => setSelectedId(conversation.id)}
        />
      </div>
    </AppShell>
  );
}
