"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Schema } from "@/lib/contracts";
export default function BackendHealth() {
  const [health, setHealth] = useState<Schema["HealthStatusResponse"] | null>(
    null,
  );
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch<Schema["HealthStatusResponse"]>("/health/status", {
      signal: controller.signal,
    })
      .then(setHealth)
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <span className="cv-muted" role="status">
      {unavailable
        ? "Service indisponible"
        : !health
          ? "Vérification du service…"
          : health.status === "UP"
            ? "Service disponible"
            : health.status === "DEGRADED"
              ? "Service disponible · fonctions IA indisponibles"
              : "Service indisponible"}
    </span>
  );
}
