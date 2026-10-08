"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { singleFlight } from "@/lib/singleFlight";

/**
 * Runs an async action at most once at a time and exposes whether it is
 * running, so its button can show a pending state. Errors go to `onError`
 * instead of becoming unhandled promise rejections.
 */
export function usePendingAction<A extends unknown[]>(
  action: (...args: A) => Promise<unknown>,
  onError?: (error: unknown) => void,
) {
  const [pending, setPending] = useState(false);
  const latest = useRef({ action, onError });
  useEffect(() => {
    latest.current = { action, onError };
  });

  const run = useMemo(
    () =>
      singleFlight(async (...args: A) => {
        setPending(true);
        try {
          await latest.current.action(...args);
        } catch (error) {
          latest.current.onError?.(error);
        } finally {
          setPending(false);
        }
      }),
    [],
  );

  return [run, pending] as const;
}
