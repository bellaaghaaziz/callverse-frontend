"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Schema } from "@/lib/contracts";
import {
  AI_FEATURES,
  capabilityFor,
  type AiCapability,
  type AiFeature,
  type AiHealth,
} from "@/lib/ai";
// Health is only read for a feature whose façade exists, so pages make no
// extra request while every AI feature is still « Bientôt disponible ».
export function useAiCapability(feature: AiFeature): AiCapability {
  const needsHealth = AI_FEATURES[feature];
  const [health, setHealth] = useState<AiHealth | null>(null);
  useEffect(() => {
    if (!needsHealth) return;
    let controller = new AbortController();
    const check = () => {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;
      apiFetch<Schema["HealthStatusResponse"]>("/health/status", { signal })
        .then((response) => setHealth(response.status))
        .catch(() => {
          if (!signal.aborted) setHealth("UNREACHABLE");
        });
    };
    check();
    // Re-read after a reconnect, which follows a backend restart.
    window.addEventListener("callverse:reconnected", check);
    return () => {
      controller.abort();
      window.removeEventListener("callverse:reconnected", check);
    };
  }, [needsHealth]);
  return capabilityFor(feature, health);
}
