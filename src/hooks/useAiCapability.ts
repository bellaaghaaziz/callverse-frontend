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
    const controller = new AbortController();
    apiFetch<Schema["HealthStatusResponse"]>("/health/status", {
      signal: controller.signal,
    })
      .then((response) => setHealth(response.status))
      .catch(() => {
        if (!controller.signal.aborted) setHealth("UNREACHABLE");
      });
    return () => controller.abort();
  }, [needsHealth]);
  return capabilityFor(feature, health);
}
