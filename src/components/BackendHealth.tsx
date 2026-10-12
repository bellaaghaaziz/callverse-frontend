"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Schema } from "@/lib/contracts";
import { serviceStatus } from "@/lib/login";
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
  const { state, text } = serviceStatus(health?.status ?? null, unavailable);
  return (
    <span className="cv-muted" role="status" data-state={state}>
      {text}
    </span>
  );
}
