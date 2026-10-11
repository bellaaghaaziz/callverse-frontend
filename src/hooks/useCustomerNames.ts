import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Customer } from "@/lib/contracts";
import { customerDisplayName, customerIdsKey } from "@/lib/presentation";

// Display names for the customers behind a list (conversations, alerts):
// each customer is requested once; ids map to « Prénom Nom ».
export function useCustomerNames(items: { customerId?: string | null }[]) {
  const [customerNames, setCustomerNames] = useState<Record<string, string>>(
    {},
  );
  // Ids with a request in flight or answered, so a new id costs one request.
  const requested = useRef(new Set<string>());
  const customerIds = customerIdsKey(items);
  useEffect(() => {
    const seen = requested.current;
    const missing = customerIds.split(",").filter((id) => id && !seen.has(id));
    if (!missing.length) return;
    const controller = new AbortController();
    const answered = new Set<string>();
    for (const id of missing) seen.add(id);
    void Promise.allSettled(
      missing.map(async (id) => {
        const profile = await apiFetch<Customer>("/customers/" + id, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        answered.add(id);
        setCustomerNames((previous) => ({
          ...previous,
          [id]: customerDisplayName(profile),
        }));
      }),
    );
    return () => {
      controller.abort();
      // Cancelled before an answer: let the next run ask again.
      for (const id of missing) if (!answered.has(id)) seen.delete(id);
    };
  }, [customerIds]);
  return customerNames;
}
