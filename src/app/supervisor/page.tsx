"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import AlertsCard from "@/components/supervisor/AlertsCard";
import KpiTiles from "@/components/supervisor/KpiTiles";
import QueuesCard from "@/components/supervisor/QueuesCard";
import SupervisionCharts from "@/components/supervisor/SupervisionCharts";
import { apiFetch, errorMessage } from "@/lib/api";
import type { LiveKpi, SupervisionAlert } from "@/lib/contracts";
import { useConnection, useTopic } from "@/hooks/useTopic";
import { reconnectStomp } from "@/lib/stomp";
import { RefreshCw } from "lucide-react";
import { useCustomerNames } from "@/hooks/useCustomerNames";
import WorkforceCard from "@/components/ai/WorkforceCard";
import { useRouter } from "next/navigation";
import { pushSample, type Sample } from "@/lib/charts";
type AlertHistory = { content: SupervisionAlert[]; page: { number: number; totalPages: number } };
function mergeAlerts(previous: SupervisionAlert[], incoming: SupervisionAlert[]) {
  const unique = new Map<string, SupervisionAlert>();
  [...previous, ...incoming].forEach(item => unique.set(`${item.type}:${item.escalationId || item.cardId}:${item.occurredAt}`, item));
  return [...unique.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
export default function SupervisorPage() {
  const [kpi, setKpi] = useState<LiveKpi | null>(null);
  const [alerts, setAlerts] = useState<SupervisionAlert[]>([]);
  const [alertPage, setAlertPage] = useState(0);
  const [moreAlerts, setMoreAlerts] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const alertNames = useCustomerNames(alerts);
  const [error, setError] = useState("");
  const router = useRouter();
  // The waiting total of every live snapshot this session, for the trend chart.
  const [waitingHistory, setWaitingHistory] = useState<Sample[]>([]);
  const connection = useConnection();
  const latestAt = useRef("");
  const requestVersion = useRef(0);
  const acceptKpi = useCallback((snapshot: LiveKpi) => {
    if (snapshot.schemaVersion !== 1 || snapshot.at < latestAt.current) return;
    latestAt.current = snapshot.at;
    setKpi(snapshot);
    setWaitingHistory(previous => pushSample(previous, { at: snapshot.at, value: snapshot.waitingTotal }, 40));
  }, []);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const [snapshot, history] = await Promise.all([
        apiFetch<LiveKpi>("/supervision/kpi"),
        apiFetch<AlertHistory>("/supervision/alerts?size=20"),
      ]);
      if (version === requestVersion.current) {
        acceptKpi(snapshot);
        setAlerts(previous => mergeAlerts(previous, history.content));
        setAlertPage(0);
        setMoreAlerts(history.page.totalPages > 1);
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
  useTopic<SupervisionAlert>("/topic/supervision/alerts", alert => setAlerts(previous => mergeAlerts(previous, [alert])));
  async function loadMoreAlerts() {
    if (loadingAlerts) return;
    setLoadingAlerts(true);
    try {
      const history = await apiFetch<AlertHistory>(`/supervision/alerts?page=${alertPage + 1}&size=20`);
      setAlerts(previous => mergeAlerts(previous, history.content));
      setAlertPage(history.page.number);
      setMoreAlerts(history.page.number + 1 < history.page.totalPages);
    } catch (error) { setError(errorMessage(error)); }
    finally { setLoadingAlerts(false); }
  }
  // Alerts open the conversation on its own page.
  const openConversation = (id: string) => router.push(`/supervisor/conversations?open=${id}`);
  return (
    <AppShell
      role="Superviseur"
      initials="SV"
      title="Vue d’ensemble"
      variant="green"
    >
      {/* Green-direction dashboard (R4.7, 2026-10-11 mockup); styles in supervisor.css. */}
      <div className="cv-supervisor">
        <div className="cv-page-heading" id="workspace">
          <div>
            <p className="cv-eyebrow">PILOTAGE DE L’ACTIVITÉ</p>
            <h1>Gardez une longueur d’avance.</h1>
            <p className="cv-subtitle">
              Les files, les indicateurs et les alertes de votre équipe, en
              direct.
            </p>
          </div>
          <div className="cv-heading-actions">
            <span
              className={
                "cv-live " + (connection !== "connected" ? "cv-live-off" : "")
              }
            >
              {connection === "connected"
                ? "Flux en direct connecté"
                : "Connexion interrompue"}
            </span>
            <button
              onClick={() => {
                reconnectStomp();
                void refresh();
              }}
              className="cv-button cv-button-secondary"
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="cv-error cv-page-error">
            {error}
          </p>
        )}
        <KpiTiles kpi={kpi} />
        <SupervisionCharts kpi={kpi} waitingHistory={waitingHistory} />
        <WorkforceCard />
        <div className="cv-two-columns">
          <QueuesCard kpi={kpi} />
          <AlertsCard
            alerts={alerts}
            names={alertNames}
            onOpen={openConversation}
            hasMore={moreAlerts}
            loading={loadingAlerts}
            onLoadMore={() => void loadMoreAlerts()}
          />
        </div>
      </div>
    </AppShell>
  );
}
